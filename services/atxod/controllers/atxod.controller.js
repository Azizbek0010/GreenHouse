const Atxod = require('../models/Atxod')
const emit  = require('../utils/emit')

exports.create = async (req, res, next) => {
  try {
    const { flowerType, razmer, qty, sabab, qiymat } = req.body
    const photo = req.file ? `/uploads/atxod/${req.file.filename}` : null
    if (!photo) return res.status(400).json({ message: 'Rasm majburiy' })

    const qtyN = Number(qty), razmerN = Number(razmer), qiymatN = Number(qiymat)
    if (!flowerType || !Number.isInteger(qtyN) || qtyN <= 0 || !Number.isFinite(razmerN) || razmerN <= 0)
      return res.status(400).json({ message: "Gul turi, razmer va soni to'g'ri kiritilishi shart" })
    if (!qiymatN || qiymatN <= 0)
      return res.status(400).json({ message: "Qiymatni kiriting (so'm)" })

    const atxod = await Atxod.create({ kassa: req.user.id, flowerType, razmer: razmerN, qty: qtyN, sabab, qiymat: qiymatN, photo })
    await emit('admin', 'yangi_atxod', { kassa: req.user.name, flowerType: atxod.flowerType, qty: atxod.qty, sabab: atxod.sabab })
    res.status(201).json(atxod)
  } catch (err) { next(err) }
}

exports.getAll = async (req, res, next) => {
  try {
    const filter = {}
    if (req.user.role === 'kassa') filter.kassa = req.user.id
    if (req.query.status) filter.status = req.query.status
    const list = await Atxod.find(filter).populate('kassa','name').sort({ createdAt: -1 })
    res.json(list)
  } catch (err) { next(err) }
}

exports.review = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body
    if (!['approved','rejected'].includes(status))
      return res.status(400).json({ message: "Status noto'g'ri" })
    const atxod = await Atxod.findByIdAndUpdate(req.params.id, { status, adminNote }, { returnDocument: 'after' })
    if (!atxod) return res.status(404).json({ message: 'Topilmadi' })
    res.json(atxod)
  } catch (err) { next(err) }
}
