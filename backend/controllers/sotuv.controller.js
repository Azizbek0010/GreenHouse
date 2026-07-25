const Sotuv = require('../models/Sotuv')
const { resolveSana, sanaFields, resolveSanaForEdit, forceCreatedAt } = require('../utils/sana')
const { tolovSotuv, teng } = require('../utils/tolov')

exports.create = async (req, res, next) => {
  try {
    const { flowerType, razmer, qty, holat, pricePerUnit, discountPrice, sana } = req.body

    // Ixtiyoriy sana: tanlanmasa — hozirgi vaqt
    const s = resolveSana(sana)
    if (s.error) return res.status(400).json({ message: s.error })

    const qtyN = Number(qty), priceN = Number(pricePerUnit), razmerN = Number(razmer)
    if (!flowerType || !Number.isInteger(qtyN) || qtyN <= 0 || !Number.isFinite(priceN) || priceN <= 0 || !Number.isFinite(razmerN) || razmerN <= 0)
      return res.status(400).json({ message: 'Gul turi, razmer, soni va narx to\'g\'ri kiritilishi shart' })

    let discountN = null
    if (discountPrice != null && discountPrice !== '') {
      discountN = Number(discountPrice)
      if (!Number.isFinite(discountN) || discountN <= 0)
        return res.status(400).json({ message: "Chegirma narxi to'g'ri kiritilishi shart" })
      if (discountN > priceN * qtyN)
        return res.status(400).json({ message: "Chegirma narxi asl narxdan yuqori bo'lishi mumkin emas" })
    }

    // To'lov — totalPrice pre('save') da hisoblanadi, lekin tekshirish uchun
    // shu yerda ham kerak: summalar jamiga teng kelishi shart
    const totalPrice = discountN != null ? discountN : priceN * qtyN
    const t = tolovSotuv(req.body, totalPrice)
    if (t.error) return res.status(400).json({ message: t.error })

    const sotuv = await Sotuv.create({
      kassa: req.user.id,
      flowerType,
      razmer: razmerN,
      qty: qtyN,
      holat,
      pricePerUnit: priceN,
      discountPrice: discountN,
      tolov:      t.tolov,
      naqtSumma:  t.naqt,
      kartaSumma: t.karta,
      ...sanaFields(s),
    })

    const io = req.app.get('io')
    io.to('admin').emit('yangi_sotuv', {
      kassa: req.user.name,
      flowerType: sotuv.flowerType,
      qty: sotuv.qty,
      totalPrice: sotuv.totalPrice,
    })

    res.status(201).json(sotuv)
  } catch (err) {
    next(err)
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const filter = {}
    if (req.user.role === 'kassa') filter.kassa = req.user.id

    const { from, to } = req.query
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to)   filter.createdAt.$lte = new Date(to)
    }

    const sotuvlar = await Sotuv.find(filter)
      .populate('kassa', 'name')
      .sort({ createdAt: -1 })

    const total = sotuvlar.reduce((s, x) => s + x.totalPrice, 0)
    res.json({ sotuvlar, total })
  } catch (err) {
    next(err)
  }
}

exports.getOne = async (req, res, next) => {
  try {
    const sotuv = await Sotuv.findById(req.params.id).populate('kassa', 'name')
    if (!sotuv) return res.status(404).json({ message: 'Topilmadi' })
    res.json(sotuv)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/sotuv/:id — admin tahrirlaydi (totalPrice pre-save da qayta hisoblanadi)
exports.adminUpdate = async (req, res, next) => {
  try {
    const sotuv = await Sotuv.findById(req.params.id)
    if (!sotuv) return res.status(404).json({ message: 'Topilmadi' })

    const { flowerType, razmer, qty, holat, pricePerUnit, discountPrice } = req.body
    const oldTotal = sotuv.totalPrice   // to'lov bo'linishini tekshirish uchun kerak

    if (flowerType !== undefined) {
      if (!flowerType || typeof flowerType !== 'string' || !flowerType.trim())
        return res.status(400).json({ message: "Gul turi noto'g'ri" })
      sotuv.flowerType = flowerType.trim()
    }
    if (razmer !== undefined) {
      const n = Number(razmer)
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: "Razmer noto'g'ri" })
      sotuv.razmer = n
    }
    if (qty !== undefined) {
      const n = Number(qty)
      if (!Number.isInteger(n) || n <= 0) return res.status(400).json({ message: "Soni noto'g'ri" })
      sotuv.qty = n
    }
    if (holat !== undefined) {
      if (!['yaxshi', 'nuqsonli'].includes(holat)) return res.status(400).json({ message: "Holat noto'g'ri" })
      sotuv.holat = holat
    }
    if (pricePerUnit !== undefined) {
      const n = Number(pricePerUnit)
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: "Narx noto'g'ri" })
      sotuv.pricePerUnit = n
    }
    if (discountPrice !== undefined) {
      if (discountPrice === null || discountPrice === '') {
        sotuv.discountPrice = null
      } else {
        const n = Number(discountPrice)
        if (!Number.isFinite(n) || n <= 0)
          return res.status(400).json({ message: "Chegirma narxi to'g'ri kiritilishi shart" })
        sotuv.discountPrice = n
      }
    }
    if (sotuv.discountPrice != null && sotuv.discountPrice > sotuv.pricePerUnit * sotuv.qty)
      return res.status(400).json({ message: "Chegirma narxi asl narxdan yuqori bo'lishi mumkin emas" })

    // ── To'lov bo'linishi ────────────────────────────────────────────────
    // Yangi jami — pre('save') dagi hisob bilan bir xil bo'lishi shart
    const newTotal = sotuv.discountPrice != null ? sotuv.discountPrice : sotuv.pricePerUnit * sotuv.qty

    if (req.body.naqtSumma !== undefined || req.body.kartaSumma !== undefined || req.body.tolov !== undefined) {
      const t = tolovSotuv(req.body, newTotal)
      if (t.error) return res.status(400).json({ message: t.error })
      sotuv.tolov      = t.tolov
      sotuv.naqtSumma  = t.naqt
      sotuv.kartaSumma = t.karta
    } else if (!teng(newTotal, oldTotal)) {
      // Narx yoki soni o'zgardi — eski bo'linish endi jamiga to'g'ri kelmaydi.
      // Aralash to'lovda o'zimiz proporsiya bilan qayta taqsimlamaymiz: kassaga
      // qancha naqd, qancha karta tushgani — haqiqiy fakt, uni to'qib bo'lmaydi.
      if (sotuv.tolov === 'aralash')
        return res.status(400).json({
          message: "Summa o'zgardi — naqt va karta summalarini qaytadan kiriting",
        })
      if (sotuv.tolov === 'naqt' || sotuv.tolov === 'karta') {
        sotuv.naqtSumma  = sotuv.tolov === 'naqt'  ? newTotal : 0
        sotuv.kartaSumma = sotuv.tolov === 'karta' ? newTotal : 0
      }
      // tolov === null — eski "noma'lum" yozuv, tegmaymiz
    }

    // Sotuv sanasi (createdAt) — immutable, save dan keyin majburlanadi
    const sanaEdit = resolveSanaForEdit(req.body.sana)
    if (sanaEdit.error) return res.status(400).json({ message: sanaEdit.error })

    await sotuv.save()
    if (!sanaEdit.skip) await forceCreatedAt(Sotuv, sotuv, sanaEdit)
    await sotuv.populate('kassa', 'name')
    res.json(sotuv)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/sotuv/:id — admin o'chiradi (statistika avtomatik qayta hisoblanadi)
exports.adminDelete = async (req, res, next) => {
  try {
    const sotuv = await Sotuv.findByIdAndDelete(req.params.id)
    if (!sotuv) return res.status(404).json({ message: 'Topilmadi' })
    res.json({ message: "Sotuv o'chirildi", id: sotuv._id })
  } catch (err) {
    next(err)
  }
}

exports.getStats = async (req, res, next) => {
  try {
    const stats = await Sotuv.aggregate([
      { $group: { _id: { type: '$flowerType', razmer: '$razmer' }, qty: { $sum: '$qty' }, daromad: { $sum: '$totalPrice' } } },
      { $sort: { daromad: -1 } },
    ])
    res.json(stats)
  } catch (err) {
    next(err)
  }
}
