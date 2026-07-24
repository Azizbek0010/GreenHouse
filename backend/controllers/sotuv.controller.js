const Sotuv = require('../models/Sotuv')
const { resolveSana, sanaFields, resolveSanaForEdit, forceCreatedAt } = require('../utils/sana')

exports.create = async (req, res, next) => {
  try {
    const { flowerType, razmer, qty, holat, pricePerUnit, discountPrice, sana, tolov } = req.body

    if (tolov != null && !['naqt', 'karta'].includes(tolov))
      return res.status(400).json({ message: "To'lov usuli noto'g'ri" })

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

    const sotuv = await Sotuv.create({
      kassa: req.user.id,
      flowerType,
      razmer: razmerN,
      qty: qtyN,
      holat,
      pricePerUnit: priceN,
      discountPrice: discountN,
      tolov: tolov ?? null,
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

    const { flowerType, razmer, qty, holat, pricePerUnit, discountPrice, tolov } = req.body

    if (tolov !== undefined) {
      if (tolov !== null && !['naqt', 'karta'].includes(tolov))
        return res.status(400).json({ message: "To'lov usuli noto'g'ri" })
      sotuv.tolov = tolov
    }
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
