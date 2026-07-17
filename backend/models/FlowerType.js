const mongoose = require('mongoose')

// Gul turlari — admin boshqaradi, hamma rollarda ro'yxat ko'rinadi
const flowerTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true })

module.exports = mongoose.model('FlowerType', flowerTypeSchema)
