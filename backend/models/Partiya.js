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
  sentTotal: { type: Number, default: null }, // YANGI rejim: teplitsa yuborgan umumiy soni (tur/razmersiz)
  sent:      [flowerSchema],                  // ESKI rejim: tur+razmer bo'yicha (legacy partiyalar uchun)
  received:  [flowerSchema],
  farq:      { type: Array, default: [] },    // ESKI rejim: per-type farq (legacy)
  farqSoni:  { type: Number, default: null }, // YANGI rejim: raqamli farq (qabul jami − sentTotal)
  backfill:  { type: Boolean, default: false }, // sana qo'lda tanlangan
  enteredAt: { type: Date, default: null },     // yozuv aslida qachon kiritilgan
}, { timestamps: true })

partiyaSchema.pre('save', async function () {
  if (!this.batchId) {
    const UZ_MONTHS = ['yan','fev','mar','apr','may','iyun','iyul','avg','sen','okt','noy','dek']
    // Sana qo'lda tanlangan bo'lsa — batchId ham o'sha kunga tegishli bo'lishi kerak.
    // Aks holda eski partiya bugungi imzoni olib, unique batchId da to'qnashardi.
    const ref   = this.createdAt || new Date()
    const day   = ref.getDate()
    const month = UZ_MONTHS[ref.getMonth()]

    const startOfDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0)
    const endOfDay   = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999)

    const dayCount = await mongoose.model('Partiya').countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })

    this.batchId = `${day}-${month}. PARTIYA-${dayCount + 1}`
  }
})

partiyaSchema.index({ teplitsa: 1, createdAt: -1 })
partiyaSchema.index({ kassa: 1, createdAt: -1 })
partiyaSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('Partiya', partiyaSchema)
