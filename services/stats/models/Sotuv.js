const mongoose = require('mongoose')
const s = new mongoose.Schema({
  kassa: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  flowerType: String, razmer: Number, qty: Number,
  holat: String, pricePerUnit: Number, totalPrice: Number, photo: String,
}, { timestamps: true })
s.pre('save', function () { this.totalPrice = this.pricePerUnit * this.qty })
module.exports = mongoose.model('Sotuv', s)
