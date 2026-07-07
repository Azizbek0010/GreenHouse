const mongoose = require('mongoose')

// Bir qarz ichidagi bitta gul turi
const flowerSchema = new mongoose.Schema({
  type:         { type: String, required: true },
  razmer:       { type: Number, required: true },
  qty:          { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
}, { _id: false })

// Qarzni bo'lib-bo'lib to'lash tarixi (variant A: har bir to'lov o'sha kuni daromadga tushadi)
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  at:     { type: Date, default: Date.now },
}, { _id: false })

const qarzSchema = new mongoose.Schema({
  kassa:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flowers:     { type: [flowerSchema], validate: v => Array.isArray(v) && v.length > 0 },
  flowerPhoto: { type: String, required: true },   // gul rasmi (majburiy)
  buyer: {
    name:  { type: String, required: true },       // sotib oluvchi ismi
    phone: { type: String, required: true },       // telefon raqami
    photo: { type: String, required: true },       // sotib oluvchi rasmi (majburiy)
  },
  totalPrice:  { type: Number, required: true },    // umumiy qarz summasi
  paidAmount:  { type: Number, default: 0 },        // shu paytgacha to'langan
  payments:    { type: [paymentSchema], default: [] },
  isPaid:      { type: Boolean, default: false },
  paidAt:      { type: Date, default: null },       // to'liq yopilgan sana
}, { timestamps: true })

qarzSchema.index({ kassa: 1, createdAt: -1 })
qarzSchema.index({ isPaid: 1, createdAt: -1 })

module.exports = mongoose.model('Qarz', qarzSchema)
