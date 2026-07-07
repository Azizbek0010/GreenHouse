const Sotuv = require('../models/Sotuv')

exports.create = async (req, res, next) => {
  try {
    const { flowerType, razmer, qty, holat, pricePerUnit } = req.body
    const photo = req.file ? req.file.path : null

    const qtyN = Number(qty), priceN = Number(pricePerUnit), razmerN = Number(razmer)
    if (!flowerType || !Number.isInteger(qtyN) || qtyN <= 0 || !Number.isFinite(priceN) || priceN <= 0 || !Number.isFinite(razmerN) || razmerN <= 0)
      return res.status(400).json({ message: 'Gul turi, razmer, soni va narx to\'g\'ri kiritilishi shart' })

    const sotuv = await Sotuv.create({
      kassa: req.user.id,
      flowerType,
      razmer: razmerN,
      qty: qtyN,
      holat,
      pricePerUnit: priceN,
      photo,
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
