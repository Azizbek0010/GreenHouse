const Atxod = require('../models/Atxod')
const { getRemaining } = require('../utils/stock')
const { resolveSana, sanaFields } = require('../utils/sana')

exports.create = async (req, res, next) => {
  try {
    const { flowerType, razmer, qty, sabab, qiymat, sana } = req.body

    // Ixtiyoriy sana: tanlanmasa — hozirgi vaqt
    const s = resolveSana(sana)
    if (s.error) return res.status(400).json({ message: s.error })

    const qtyN = Number(qty), razmerN = Number(razmer), qiymatN = Number(qiymat)
    if (!flowerType || !Number.isInteger(qtyN) || qtyN <= 0 || !Number.isFinite(razmerN) || razmerN <= 0)
      return res.status(400).json({ message: "Gul turi, razmer va soni to'g'ri kiritilishi shart" })
    if (!qiymatN || qiymatN <= 0)
      return res.status(400).json({ message: "Qiymatni kiriting (so'm)" })

    // Ombor limiti: mavjud qoldiqdan ortiq atxod yozib bo'lmaydi
    const remaining = await getRemaining(req.user.id, flowerType, razmerN)
    if (qtyN > remaining)
      return res.status(400).json({ message: `Omborda ${flowerType} ${razmerN}sm dan faqat ${Math.max(remaining, 0)} ta qolgan` })

    const atxod = await Atxod.create({
      kassa: req.user.id,
      flowerType,
      razmer: razmerN,
      qty: qtyN,
      sabab,
      qiymat: qiymatN,
      ...sanaFields(s),
    })

    const io = req.app.get('io')
    io.to('admin').emit('yangi_atxod', {
      kassa: req.user.name,
      flowerType: atxod.flowerType,
      qty: atxod.qty,
      sabab: atxod.sabab,
    })

    res.status(201).json(atxod)
  } catch (err) {
    next(err)
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const VALID_STATUS = ['pending', 'approved', 'rejected']
    const filter = {}
    if (req.user.role === 'kassa') filter.kassa = req.user.id
    if (req.query.status && VALID_STATUS.includes(req.query.status)) filter.status = req.query.status

    const atxodlar = await Atxod.find(filter)
      .populate('kassa', 'name')
      .sort({ createdAt: -1 })

    res.json(atxodlar)
  } catch (err) {
    next(err)
  }
}

exports.getOne = async (req, res, next) => {
  try {
    const atxod = await Atxod.findById(req.params.id).populate('kassa', 'name')
    if (!atxod) return res.status(404).json({ message: 'Topilmadi' })
    res.json(atxod)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/atxod/:id — admin tahrirlaydi
exports.adminUpdate = async (req, res, next) => {
  try {
    const atxod = await Atxod.findById(req.params.id)
    if (!atxod) return res.status(404).json({ message: 'Topilmadi' })

    const { flowerType, razmer, qty, sabab, qiymat, status, adminNote } = req.body

    if (flowerType !== undefined) {
      if (!flowerType || typeof flowerType !== 'string' || !flowerType.trim())
        return res.status(400).json({ message: "Gul turi noto'g'ri" })
      atxod.flowerType = flowerType.trim()
    }
    if (razmer !== undefined) {
      const n = Number(razmer)
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: "Razmer noto'g'ri" })
      atxod.razmer = n
    }
    if (qty !== undefined) {
      const n = Number(qty)
      if (!Number.isInteger(n) || n <= 0) return res.status(400).json({ message: "Soni noto'g'ri" })
      atxod.qty = n
    }
    if (sabab !== undefined) {
      if (!["so'lgan", 'nuqsonli', 'singan', 'boshqa'].includes(sabab))
        return res.status(400).json({ message: "Sabab noto'g'ri" })
      atxod.sabab = sabab
    }
    if (qiymat !== undefined) {
      const n = Number(qiymat)
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: "Qiymat noto'g'ri" })
      atxod.qiymat = n
    }
    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(status))
        return res.status(400).json({ message: "Status noto'g'ri" })
      atxod.status = status
    }
    if (adminNote !== undefined) atxod.adminNote = adminNote || null

    await atxod.save()
    await atxod.populate('kassa', 'name')
    res.json(atxod)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/atxod/:id — admin o'chiradi
exports.adminDelete = async (req, res, next) => {
  try {
    const atxod = await Atxod.findByIdAndDelete(req.params.id)
    if (!atxod) return res.status(404).json({ message: 'Topilmadi' })
    res.json({ message: "Atxod o'chirildi", id: atxod._id })
  } catch (err) {
    next(err)
  }
}

exports.review = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Status noto\'g\'ri' })

    const atxod = await Atxod.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { returnDocument: 'after' }  // mongoose 9: { new: true } deprecated
    )
    if (!atxod) return res.status(404).json({ message: 'Topilmadi' })

    res.json(atxod)
  } catch (err) {
    next(err)
  }
}
