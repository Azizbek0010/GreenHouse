const mongoose = require('mongoose')

const sizeSchema = new mongoose.Schema({
  sm:  { type: Number, required: true },
  qty: { type: Number, required: true },
}, { _id: false })

const flowerSchema = new mongoose.Schema({
  type:  { type: String, required: true },
  sizes: [sizeSchema],
}, { _id: false })

const partiyaSchema = new mongoose.Schema({
  batchId:   { type: String, unique: true },
  teplitsa:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kassa:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['yolda', 'qabul_qilindi', 'farq_bor'], default: 'yolda' },
  sent:      [flowerSchema],
  received:  [flowerSchema],
  sentPhoto: { type: String, default: null },   // teplitsa yuborgan rasmi
  photo:     { type: String, default: null },   // kassa qabul rasmi
  farq:      { type: Array, default: [] },
}, { timestamps: true })

partiyaSchema.pre('save', async function () {
  if (!this.batchId) {
    const count = await mongoose.model('Partiya').countDocuments()
    this.batchId = `BATCH-${String(count + 1).padStart(3, '0')}`
  }
})

module.exports = mongoose.model('Partiya', partiyaSchema)
