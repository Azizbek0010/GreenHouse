const mongoose = require('mongoose')
const s = new mongoose.Schema({
  name:  { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role:  { type: String, enum: ['admin','teplitsa','kassa'], required: true },
  expoPushToken: { type: String, default: null },
}, { timestamps: true })
module.exports = mongoose.model('User', s)
