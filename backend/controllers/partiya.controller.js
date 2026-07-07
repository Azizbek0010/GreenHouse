const Partiya = require('../models/Partiya')
const User    = require('../models/User')
const { sendPush } = require('../utils/pushNotification')

// flowers strukturasini tekshirish: [{ type, sizes: [{ sm, qty }] }]
function validateFlowers(flowers) {
  if (!Array.isArray(flowers) || flowers.length === 0)
    return 'Kamida bitta gul kiritilishi shart'
  for (const f of flowers) {
    if (!f.type || !Array.isArray(f.sizes) || f.sizes.length === 0)
      return 'Har bir gulda tur va kamida bitta razmer bo\'lishi shart'
    for (const s of f.sizes) {
      if (!Number.isFinite(s.sm) || s.sm <= 0 || !Number.isInteger(s.qty) || s.qty <= 0)
        return 'Razmer (sm) va soni musbat son bo\'lishi kerak'
    }
  }
  return null
}

exports.create = async (req, res, next) => {
  try {
    const sentPhoto = req.file ? req.file.path : null
    if (!sentPhoto) return res.status(400).json({ message: 'Rasm majburiy' })

    // multipart orqali flowers JSON-string sifatida keladi
    let flowers = req.body.flowers
    if (typeof flowers === 'string') {
      try { flowers = JSON.parse(flowers) }
      catch { return res.status(400).json({ message: "flowers noto'g'ri formatda" }) }
    }

    const { kassaId } = req.body
    const flowersError = validateFlowers(flowers)
    if (flowersError) return res.status(400).json({ message: flowersError })

    const kassa = await User.findById(kassaId)
    if (!kassa || kassa.role !== 'kassa')
      return res.status(400).json({ message: 'Kassa topilmadi' })

    const partiya = await Partiya.create({
      teplitsa:  req.user.id,
      kassa:     kassaId,
      sent:      flowers,
      sentPhoto,
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
    // Admin real-time: teplitsa yubordi + rasm bor
    io.to('admin').emit('partiya_yangilandi', {
      batchId:   partiya.batchId,
      status:    'yolda',
      teplitsa:  req.user.name,
      sentPhoto,
    })

    res.status(201).json(partiya)
  } catch (err) {
    next(err)
  }
}

exports.receive = async (req, res, next) => {
  try {
    const { id } = req.params
    const photo = req.file ? req.file.path : null

    if (!photo) return res.status(400).json({ message: 'Rasm majburiy' })

    // multipart/form-data orqali kelganda flowers JSON-string bo'ladi
    let flowers = req.body.flowers
    if (typeof flowers === 'string') {
      try { flowers = JSON.parse(flowers) }
      catch { return res.status(400).json({ message: 'flowers noto\'g\'ri formatda' }) }
    }
    const flowersError = validateFlowers(flowers)
    if (flowersError) return res.status(400).json({ message: flowersError })

    const partiya = await Partiya.findById(id)
    if (!partiya) return res.status(404).json({ message: 'Partiya topilmadi' })

    // Faqat o'ziga yuborilgan partiyani qabul qila oladi
    if (partiya.kassa.toString() !== req.user.id)
      return res.status(403).json({ message: 'Bu partiya sizga yuborilmagan' })

    if (partiya.status !== 'yolda') return res.status(400).json({ message: 'Partiya allaqachon qabul qilingan' })

    partiya.received = flowers
    partiya.photo = photo
    partiya.farq = calcFarq(partiya.sent, flowers)
    partiya.status = partiya.farq.length > 0 ? 'farq_bor' : 'qabul_qilindi'

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

    // Kassirga sent va farq qaytarilmaydi (blind count)
    const { sent, farq, ...safe } = partiya.toObject()
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
        const { sent, farq, received, ...safe } = p.toObject()
        return safe
      }))
    }

    // Teplitsa kassa qanday sanaganini ko'rmaydi (farq/received yashirin).
    // farq_bor ham "qabul qilindi" sifatida ko'rinadi — farq adminning ishi.
    if (req.user.role === 'teplitsa') {
      return res.json(partiyalar.map(p => {
        const { farq, received, ...safe } = p.toObject()
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
      const { sent, farq, received, ...safe } = partiya.toObject()
      return res.json(safe)
    }

    if (req.user.role === 'teplitsa') {
      const { farq, received, ...safe } = partiya.toObject()
      if (safe.status === 'farq_bor') safe.status = 'qabul_qilindi'
      return res.json(safe)
    }

    res.json(partiya)
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

function calcFarq(sent, received) {
  const farq = []
  // 1) Yuborilgan, lekin kam/ko'p kelgan
  for (const sf of sent) {
    const rf = received.find(r => r.type === sf.type)
    for (const ss of sf.sizes) {
      const rs = rf?.sizes.find(s => s.sm === ss.sm)
      const diff = (rs?.qty ?? 0) - ss.qty
      if (diff !== 0) farq.push({ type: sf.type, sm: ss.sm, sent: ss.qty, received: rs?.qty ?? 0, diff })
    }
  }
  // 2) Teplitsa yubormagan, lekin kassa kiritgan (ortiqcha gullar)
  for (const rf of received) {
    const sf = sent.find(s => s.type === rf.type)
    for (const rs of rf.sizes) {
      const exists = sf?.sizes.find(s => s.sm === rs.sm)
      if (!exists) farq.push({ type: rf.type, sm: rs.sm, sent: 0, received: rs.qty, diff: rs.qty })
    }
  }
  return farq
}
