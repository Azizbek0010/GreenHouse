const mongoose = require('mongoose')

const atxodSchema = new mongoose.Schema({
  kassa:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flowerType: { type: String, required: true },
  razmer:     { type: Number, required: true },
  qty:        { type: Number, required: true },
  sabab:      { type: String, enum: ["so'lgan", 'nuqsonli', 'singan', 'boshqa'], required: true },
  photo:      { type: String, required: true },
  qiymat:     { type: Number, default: 0 },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:  { type: String, default: null },
}, { timestamps: true })

module.exports = mongoose.model('Atxod', atxodSchema)
