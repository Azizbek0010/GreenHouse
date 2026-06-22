const Sotuv = require('../models/Sotuv')
const emit  = require('../utils/emit')

exports.create = async (req, res, next) => {
  try {
    const { flowerType, razmer, qty, holat, pricePerUnit } = req.body
    const photo = req.file ? `/uploads/sotuv/${req.file.filename}` : null
    const qtyN = Number(qty), priceN = Number(pricePerUnit), razmerN = Number(razmer)
    if (!flowerType || !Number.isInteger(qtyN) || qtyN <= 0 || !Number.isFinite(priceN) || priceN <= 0 || !Number.isFinite(razmerN) || razmerN <= 0)
      return res.status(400).json({ message: "Gul turi, razmer, soni va narx to'g'ri kiritilishi shart" })

    const sotuv = await Sotuv.create({ kassa: req.user.id, flowerType, razmer: razmerN, qty: qtyN, holat, pricePerUnit: priceN, photo })
    await emit('admin', 'yangi_sotuv', { kassa: req.user.name, flowerType: sotuv.flowerType, qty: sotuv.qty, totalPrice: sotuv.totalPrice })
    res.status(201).json(sotuv)
  } catch (err) { next(err) }
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
    const sotuvlar = await Sotuv.find(filter).populate('kassa','name').sort({ createdAt: -1 })
    res.json({ sotuvlar, total: sotuvlar.reduce((s, x) => s + x.totalPrice, 0) })
  } catch (err) { next(err) }
}
