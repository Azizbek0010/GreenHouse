const mongoose = require('mongoose')

const sotuvSchema = new mongoose.Schema({
  kassa:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flowerType:  { type: String, required: true },
  razmer:      { type: Number, required: true },
  qty:         { type: Number, required: true },
  holat:       { type: String, enum: ['yaxshi', 'nuqsonli'], default: 'yaxshi' },
  pricePerUnit:{ type: Number, required: true },
  totalPrice:  { type: Number },
  photo:       { type: String, default: null },
}, { timestamps: true })

sotuvSchema.pre('save', function () {
  this.totalPrice = this.pricePerUnit * this.qty
})

module.exports = mongoose.model('Sotuv', sotuvSchema)
