const mongoose = require('mongoose')
const s = new mongoose.Schema({
  kassa: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  flowerType: String, razmer: Number, qty: Number,
  sabab: String, photo: String, qiymat: Number,
  status: { type: String, default: 'pending' }, adminNote: String,
}, { timestamps: true })
module.exports = mongoose.model('Atxod', s)
