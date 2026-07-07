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
    const UZ_MONTHS = ['yan','fev','mar','apr','may','iyun','iyul','avg','sen','okt','noy','dek']
    const now   = new Date()
    const day   = now.getDate()
    const month = UZ_MONTHS[now.getMonth()]

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const todayCount = await mongoose.model('Partiya').countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })

    this.batchId = `${day}-${month}. PARTIYA-${todayCount + 1}`
  }
})

partiyaSchema.index({ teplitsa: 1, createdAt: -1 })
partiyaSchema.index({ kassa: 1, createdAt: -1 })
partiyaSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('Partiya', partiyaSchema)
