const mongoose = require('mongoose')

const sotuvSchema = new mongoose.Schema({
  kassa:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flowerType:  { type: String, required: true },
  razmer:      { type: Number, required: true },
  qty:         { type: Number, required: true },
  holat:       { type: String, enum: ['yaxshi', 'nuqsonli'], default: 'yaxshi' },
  pricePerUnit:{ type: Number, required: true },
  discountPrice: { type: Number, default: null },   // chegirma bilan yakuniy narx (ixtiyoriy)
  totalPrice:  { type: Number },
  // To'lov usuli. null = eski yozuv (maydon qo'shilishidan oldin kiritilgan).
  // Ataylab default 'naqt' emas: eski sotuvlarni naqd deb yozib qo'yish —
  // hisobotni buzadigan to'qima bo'lar edi, ular "noma'lum" bo'lib qolsin.
  // 'aralash' — bitta sotuv ikki usulda to'langan (naqt + karta).
  tolov:       { type: String, enum: ['naqt', 'karta', 'aralash', null], default: null },
  // Aralash to'lovda qaysi usuldan qancha kelgani. Bitta usul bo'lsa ham
  // to'ldiriladi (hammasi bitta maydonda) — statistika shu maydonlarni qo'shadi,
  // tolov satrini emas. null = eski yozuv, unda fallback tolov bo'yicha ishlaydi.
  naqtSumma:   { type: Number, default: null },
  kartaSumma:  { type: Number, default: null },
  backfill:    { type: Boolean, default: false },  // sana qo'lda tanlangan
  enteredAt:   { type: Date, default: null },      // yozuv aslida qachon kiritilgan
}, { timestamps: true })

sotuvSchema.pre('save', function () {
  this.totalPrice = this.discountPrice != null ? this.discountPrice : this.pricePerUnit * this.qty
})

sotuvSchema.index({ kassa: 1, createdAt: -1 })
sotuvSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Sotuv', sotuvSchema)
