const FlowerType = require('../models/FlowerType')

// Boshlang'ich ro'yxat — collection bo'sh bo'lsa birinchi GET da yoziladi
const DEFAULTS = ['Гладиатор', 'Пруд ок', 'Баблас', 'Бамбастик', 'Лондонай', 'Жумилия', 'Лидия', 'Лилия фиолетовый']

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/flower-types — hamma rollar uchun
exports.getAll = async (req, res, next) => {
  try {
    let types = await FlowerType.find().sort({ createdAt: 1 })
    if (types.length === 0) {
      await FlowerType.insertMany(DEFAULTS.map(name => ({ name })), { ordered: false })
      types = await FlowerType.find().sort({ createdAt: 1 })
    }
    res.json(types)
  } catch (err) {
    next(err)
  }
}

// POST /api/flower-types { name } — admin yangi tur qo'shadi
exports.create = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim()
    if (!name) return res.status(400).json({ message: 'Gul turi nomini kiriting' })

    const exists = await FlowerType.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
    if (exists) return res.status(400).json({ message: 'Bu gul turi allaqachon mavjud' })

    const type = await FlowerType.create({ name })
    res.status(201).json(type)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/flower-types/:id — admin o'chiradi (eski yozuvlardagi nom saqlanib qoladi)
exports.remove = async (req, res, next) => {
  try {
    const type = await FlowerType.findByIdAndDelete(req.params.id)
    if (!type) return res.status(404).json({ message: 'Topilmadi' })
    res.json({ message: "Gul turi o'chirildi", id: type._id })
  } catch (err) {
    next(err)
  }
}
