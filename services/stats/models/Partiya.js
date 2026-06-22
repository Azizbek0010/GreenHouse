const mongoose = require('mongoose')
const sizeSchema   = new mongoose.Schema({ sm: Number, qty: Number }, { _id: false })
const flowerSchema = new mongoose.Schema({ type: String, sizes: [sizeSchema] }, { _id: false })
const s = new mongoose.Schema({
  batchId: String, teplitsa: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kassa: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String, sent: [flowerSchema], received: [flowerSchema],
  sentPhoto: String, photo: String, farq: Array,
}, { timestamps: true })
module.exports = mongoose.model('Partiya', s)
