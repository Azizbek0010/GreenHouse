const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password)
      return res.status(400).json({ message: 'Telefon va parol kiritilishi shart' })

    const user = await User.findOne({ phone })
    if (!user) return res.status(401).json({ message: 'Telefon yoki parol noto\'g\'ri' })

    const match = await user.comparePassword(password)
    if (!match) return res.status(401).json({ message: 'Telefon yoki parol noto\'g\'ri' })

    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, role: user.role, avatar: user.avatar },
    })
  } catch (err) {
    next(err)
  }
}

exports.savePushToken = async (req, res, next) => {
  try {
    const { expoPushToken } = req.body
    await User.findByIdAndUpdate(req.user.id, { expoPushToken })
    res.json({ message: 'Token saqlandi' })
  } catch (err) {
    next(err)
  }
}

exports.createUser = async (req, res, next) => {
  try {
    const { name, phone, password, role } = req.body
    const exists = await User.findOne({ phone })
    if (exists) return res.status(400).json({ message: 'Bu telefon allaqachon ro\'yxatdan o\'tgan' })

    const user = await User.create({ name, phone, password, role })
    res.status(201).json({ message: 'Foydalanuvchi yaratildi', id: user._id })
  } catch (err) {
    next(err)
  }
}

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch (err) {
    next(err)
  }
}

// Teplitsa partiya yuborish uchun kassalar ro'yxati (faqat id + ism)
exports.getKassalar = async (req, res, next) => {
  try {
    const kassalar = await User.find({ role: 'kassa' }).select('_id name')
    res.json(kassalar)
  } catch (err) {
    next(err)
  }
}

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })

    if (name) user.name = name.trim()

    if (phone && phone !== user.phone) {
      const exists = await User.findOne({ phone })
      if (exists) return res.status(400).json({ message: 'Bu telefon allaqachon ishlatilmoqda' })
      user.phone = phone
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Joriy parolni kiriting' })
      const match = await user.comparePassword(currentPassword)
      if (!match) return res.status(400).json({ message: 'Joriy parol noto\'g\'ri' })
      user.password = newPassword
    }

    if (req.file) {
      user.avatar = req.file.path
    }

    await user.save()
    res.json({
      message: 'Profil yangilandi',
      user: { id: user._id, name: user.name, role: user.role, avatar: user.avatar },
    })
  } catch (err) {
    next(err)
  }
}
