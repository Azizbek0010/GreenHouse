const mongoose = require('mongoose')

// Bir qarz ichidagi bitta gul turi
const flowerSchema = new mongoose.Schema({
  type:         { type: String, required: true },
  razmer:       { type: Number, required: true },
  qty:          { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  discountPrice: { type: Number, default: null },   // chegirma bilan yakuniy narx (ixtiyoriy)
}, { _id: false })

// Qarzni bo'lib-bo'lib to'lash tarixi (variant A: har bir to'lov o'sha kuni daromadga tushadi)
// usul — pul qanday kelgani. Qarzga sotishning o'zida to'lov usuli yo'q:
// o'shanda pul kelmaydi, qarzning ma'nosi shu. Usul faqat to'lov paytida ma'lum.
// boshlangich — pul qarz ochilgan paytning o'zida kelgan (aralash sotuv:
// mijoz 300 lik gulni oldi, 100 karta + 100 naqt to'ladi, 100 qarz qoldi).
// Bu flag statistika uchun kerak: aylanma (savdo) bo'linishida shu summa
// naqt/karta ustuniga o'tadi va qarz ustunidan chiqib ketadi. Keyingi
// to'lovlar (qarzni yopish) — boshlangich: false.
const paymentSchema = new mongoose.Schema({
  amount:     { type: Number, required: true },
  at:         { type: Date, default: Date.now },
  usul:       { type: String, enum: ['naqt', 'karta', null], default: null },
  boshlangich:{ type: Boolean, default: false },
}, { _id: false })

const qarzSchema = new mongoose.Schema({
  kassa:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flowers:     { type: [flowerSchema], validate: v => Array.isArray(v) && v.length > 0 },
  buyer: {
    name:  { type: String, required: true },       // sotib oluvchi ismi
    phone: { type: String, required: true },       // telefon raqami
  },
  totalPrice:  { type: Number, required: true },    // umumiy qarz summasi
  paidAmount:  { type: Number, default: 0 },        // shu paytgacha to'langan
  payments:    { type: [paymentSchema], default: [] },
  isPaid:      { type: Boolean, default: false },
  paidAt:      { type: Date, default: null },       // to'liq yopilgan sana
  backfill:    { type: Boolean, default: false },   // sana qo'lda tanlangan
  enteredAt:   { type: Date, default: null },       // yozuv aslida qachon kiritilgan
}, { timestamps: true })

qarzSchema.index({ kassa: 1, createdAt: -1 })
qarzSchema.index({ isPaid: 1, createdAt: -1 })

module.exports = mongoose.model('Qarz', qarzSchema)
