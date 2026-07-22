const Partiya = require('../models/Partiya')
const User    = require('../models/User')
const { sendPush } = require('../utils/pushNotification')
const { resolveSana, sanaFields } = require('../utils/sana')

// Legacy [{ type, sizes:[{sm,qty}] }] massividan umumiy soni
function totalOf(flowers) {
  return (flowers || []).reduce((s, f) => s + (f.sizes || []).reduce((a, x) => a + x.qty, 0), 0)
}
// Partiyaning yuborilgan/qabul qilingan umumiy soni (yangi rejim ustun, legacy — massivdan)
function sentTotalOf(p) { return p.sentTotal     != null ? p.sentTotal     : totalOf(p.sent) }
function recvTotalOf(p) { return p.receivedTotal != null ? p.receivedTotal : totalOf(p.received) }

exports.create = async (req, res, next) => {
  try {
    const { kassaId, soni, sana } = req.body
    // Teplitsa endi faqat umumiy sonni yuboradi (tur/razmersiz)
    const soniNum = Number(soni)
    if (!Number.isInteger(soniNum) || soniNum <= 0)
      return res.status(400).json({ message: 'Gullar soni musbat butun son bo\'lishi kerak' })

    // Ixtiyoriy sana: tanlanmasa — hozirgi vaqt
    const s = resolveSana(sana)
    if (s.error) return res.status(400).json({ message: s.error })

    const kassa = await User.findById(kassaId)
    if (!kassa || kassa.role !== 'kassa')
      return res.status(400).json({ message: 'Kassa topilmadi' })

    const partiya = await Partiya.create({
      teplitsa:  req.user.id,
      kassa:     kassaId,
      sentTotal: soniNum,
      ...sanaFields(s),
    })

    if (kassa.expoPushToken) {
      await sendPush(kassa.expoPushToken, "Yangi partiya yo'lda", 'Teplitsadan partiya yuborildi. Qabul qilishga tayyorlan.')
    }

    const io = req.app.get('io')
    // Kassa real-time xabar
    io.to(`user_${kassaId}`).emit('yangi_partiya', {
      batchId:  partiya.batchId,
      teplitsa: req.user.name,
      message:  "Yangi partiya yo'lda!",
    })
    // Admin real-time: teplitsa yubordi
    io.to('admin').emit('partiya_yangilandi', {
      batchId:   partiya.batchId,
      status:    'yolda',
      teplitsa:  req.user.name,
    })

    res.status(201).json(partiya)
  } catch (err) {
    next(err)
  }
}

exports.receive = async (req, res, next) => {
  try {
    const { id } = req.params
    // Kassa faqat nechta gul kelganini kiritadi — tur va razmer qabulda kerak emas
    const soniNum = Number(req.body.soni)
    if (!Number.isInteger(soniNum) || soniNum <= 0)
      return res.status(400).json({ message: 'Kelgan gullar soni musbat butun son bo\'lishi kerak' })

    const partiya = await Partiya.findById(id)
    if (!partiya) return res.status(404).json({ message: 'Partiya topilmadi' })

    // Faqat o'ziga yuborilgan partiyani qabul qila oladi
    if (partiya.kassa.toString() !== req.user.id)
      return res.status(403).json({ message: 'Bu partiya sizga yuborilmagan' })

    if (partiya.status !== 'yolda') return res.status(400).json({ message: 'Partiya allaqachon qabul qilingan' })

    // Farq faqat umumiy son bo'yicha: kassa sanagani − teplitsa yuborgani
    partiya.receivedTotal = soniNum
    partiya.farqSoni      = soniNum - sentTotalOf(partiya)
    partiya.status        = partiya.farqSoni === 0 ? 'qabul_qilindi' : 'farq_bor'

    await partiya.save()

    // Admin va teplitsaga real-time: partiya qabul qilindi
    const io = req.app.get('io')
    io.to('admin').emit('partiya_yangilandi', {
      batchId: partiya.batchId,
      status: partiya.status,
      farq: partiya.farq,
    })
    io.to(`user_${partiya.teplitsa}`).emit('partiya_qabul', {
      batchId: partiya.batchId,
      // Teplitsaga farq ko'rinmaydi — har doim "qabul qilindi"
      status: 'qabul_qilindi',
    })

    // Kassirga sent/sentTotal va farq/farqSoni qaytarilmaydi (blind count)
    const { sent, sentTotal, farq, farqSoni, ...safe } = partiya.toObject()
    res.json(safe)
  } catch (err) {
    next(err)
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const VALID_STATUS = ['yolda', 'qabul_qilindi', 'farq_bor']
    const filter = {}
    if (req.user.role === 'teplitsa') filter.teplitsa = req.user.id
    if (req.user.role === 'kassa')    filter.kassa = req.user.id
    if (req.query.status && VALID_STATUS.includes(req.query.status)) filter.status = req.query.status

    const partiyalar = await Partiya.find(filter)
      .populate('teplitsa', 'name')
      .populate('kassa', 'name')
      .sort({ createdAt: -1 })

    if (req.user.role === 'kassa') {
      return res.json(partiyalar.map(p => {
        const { sent, sentTotal, farq, farqSoni, received, ...safe } = p.toObject()
        return safe
      }))
    }

    // Teplitsa kassa qanday sanaganini ko'rmaydi (farq/farqSoni/received yashirin).
    // O'zi yuborgan sentTotal ko'rinadi. farq_bor ham "qabul qilindi" sifatida ko'rinadi.
    if (req.user.role === 'teplitsa') {
      return res.json(partiyalar.map(p => {
        const { farq, farqSoni, received, receivedTotal, ...safe } = p.toObject()
        if (safe.status === 'farq_bor') safe.status = 'qabul_qilindi'
        return safe
      }))
    }

    res.json(partiyalar)
  } catch (err) {
    next(err)
  }
}

exports.getOne = async (req, res, next) => {
  try {
    const partiya = await Partiya.findById(req.params.id)
      .populate('teplitsa', 'name')
      .populate('kassa', 'name')
    if (!partiya) return res.status(404).json({ message: 'Topilmadi' })

    // Har kim faqat o'z partiyasini ko'radi (admin hammasini)
    if (req.user.role === 'kassa' && partiya.kassa._id.toString() !== req.user.id)
      return res.status(403).json({ message: 'Ruxsat yo\'q' })
    if (req.user.role === 'teplitsa' && partiya.teplitsa._id.toString() !== req.user.id)
      return res.status(403).json({ message: 'Ruxsat yo\'q' })

    if (req.user.role === 'kassa') {
      const { sent, sentTotal, farq, farqSoni, received, ...safe } = partiya.toObject()
      return res.json(safe)
    }

    if (req.user.role === 'teplitsa') {
      const { farq, farqSoni, received, receivedTotal, ...safe } = partiya.toObject()
      if (safe.status === 'farq_bor') safe.status = 'qabul_qilindi'
      return res.json(safe)
    }

    res.json(partiya)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/partiya/:id — admin yuborilgan/qabul qilingan sonni tahrirlaydi,
// farq avtomatik qayta hisoblanadi
exports.adminUpdate = async (req, res, next) => {
  try {
    const partiya = await Partiya.findById(req.params.id)
    if (!partiya) return res.status(404).json({ message: 'Topilmadi' })

    const { soni, qabulSoni } = req.body

    if (soni !== undefined) {
      const soniNum = Number(soni)
      if (!Number.isInteger(soniNum) || soniNum <= 0)
        return res.status(400).json({ message: 'Yuborilgan soni musbat butun son bo\'lishi kerak' })
      partiya.sentTotal = soniNum
      partiya.sent = []   // eski tur+razmer yozuvi endi kerak emas
    }

    if (qabulSoni !== undefined) {
      if (partiya.status === 'yolda')
        return res.status(400).json({ message: "Partiya hali qabul qilinmagan — faqat yuborilganini tahrirlash mumkin" })
      const qabulNum = Number(qabulSoni)
      if (!Number.isInteger(qabulNum) || qabulNum <= 0)
        return res.status(400).json({ message: 'Qabul qilingan soni musbat butun son bo\'lishi kerak' })
      partiya.receivedTotal = qabulNum
      partiya.received = []
    }

    // Qabul qilingan partiyada farq va status qayta hisoblanadi
    if (partiya.status !== 'yolda') {
      partiya.farq     = []
      partiya.farqSoni = recvTotalOf(partiya) - sentTotalOf(partiya)
      partiya.status   = partiya.farqSoni === 0 ? 'qabul_qilindi' : 'farq_bor'
    }

    await partiya.save()

    const io = req.app.get('io')
    io.to('admin').emit('partiya_yangilandi', {
      batchId: partiya.batchId,
      status:  partiya.status,
      farq:    partiya.farq,
    })

    await partiya.populate([{ path: 'teplitsa', select: 'name' }, { path: 'kassa', select: 'name' }])
    res.json(partiya)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/partiya/:id — admin o'chiradi
exports.adminDelete = async (req, res, next) => {
  try {
    const partiya = await Partiya.findByIdAndDelete(req.params.id)
    if (!partiya) return res.status(404).json({ message: 'Topilmadi' })
    res.json({ message: "Partiya o'chirildi", id: partiya._id })
  } catch (err) {
    next(err)
  }
}

exports.confirmFarq = async (req, res, next) => {
  try {
    const partiya = await Partiya.findById(req.params.id)
    if (!partiya) return res.status(404).json({ message: 'Topilmadi' })
    if (partiya.status !== 'farq_bor') return res.status(400).json({ message: 'Partiya farq_bor holatida emas' })

    partiya.status = 'qabul_qilindi'
    await partiya.save()

    const io = req.app.get('io')
    io.to('admin').emit('partiya_yangilandi', { batchId: partiya.batchId, status: 'qabul_qilindi' })

    res.json(partiya)
  } catch (err) {
    next(err)
  }
}
