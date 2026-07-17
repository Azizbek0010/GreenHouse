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
}, { timestamps: true })

sotuvSchema.pre('save', function () {
  this.totalPrice = this.discountPrice != null ? this.discountPrice : this.pricePerUnit * this.qty
})

sotuvSchema.index({ kassa: 1, createdAt: -1 })
sotuvSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Sotuv', sotuvSchema)
