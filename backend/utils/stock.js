const mongoose = require('mongoose')
const Partiya = require('../models/Partiya')
const Sotuv   = require('../models/Sotuv')
const Qarz    = require('../models/Qarz')
const Atxod   = require('../models/Atxod')

// Ombor qoldig'i — live-agregatsiya (statistika kabi, saqlanadigan hisoblagich yo'q):
//   qoldiq = qabul qilingan (partiya received) - sotuv - qarz - atxod (rejected dan tashqari)
// Hammasi (type, razmer) kesimida va kassa bo'yicha alohida.

const key = (type, sm) => `${String(type).trim()}|${Number(sm)}`

// To'liq qoldiq xaritasi: Map<"type|sm", { type, razmer, received, sold, qarz, atxod, remaining }>
// kassaId = null → hamma kassalar bo'yicha jami (admin ko'rinishi)
async function getStockMap(kassaId) {
  const byKassa = kassaId ? { kassa: new mongoose.Types.ObjectId(String(kassaId)) } : {}

  const [received, sold, qarzed, atxodlar] = await Promise.all([
    Partiya.aggregate([
      { $match: { ...byKassa, status: { $ne: 'yolda' } } },
      { $unwind: '$received' },
      { $unwind: '$received.sizes' },
      { $group: {
        _id: { type: { $trim: { input: '$received.type' } }, sm: '$received.sizes.sm' },
        qty: { $sum: '$received.sizes.qty' },
      } },
    ]),
    Sotuv.aggregate([
      { $match: { ...byKassa } },
      { $group: {
        _id: { type: { $trim: { input: '$flowerType' } }, sm: '$razmer' },
        qty: { $sum: '$qty' },
      } },
    ]),
    Qarz.aggregate([
      { $match: { ...byKassa } },
      { $unwind: '$flowers' },
      { $group: {
        _id: { type: { $trim: { input: '$flowers.type' } }, sm: '$flowers.razmer' },
        qty: { $sum: '$flowers.qty' },
      } },
    ]),
    Atxod.aggregate([
      { $match: { ...byKassa, status: { $ne: 'rejected' } } },
      { $group: {
        _id: { type: { $trim: { input: '$flowerType' } }, sm: '$razmer' },
        qty: { $sum: '$qty' },
      } },
    ]),
  ])

  const map = new Map()
  const row = (type, sm) => {
    const k = key(type, sm)
    if (!map.has(k)) map.set(k, { type: String(type).trim(), razmer: Number(sm), received: 0, sold: 0, qarz: 0, atxod: 0, remaining: 0 })
    return map.get(k)
  }

  for (const r of received) row(r._id.type, r._id.sm).received = r.qty
  for (const r of sold)     row(r._id.type, r._id.sm).sold     = r.qty
  for (const r of qarzed)   row(r._id.type, r._id.sm).qarz     = r.qty
  for (const r of atxodlar) row(r._id.type, r._id.sm).atxod    = r.qty

  for (const v of map.values()) v.remaining = v.received - v.sold - v.qarz - v.atxod
  return map
}

// Bitta (type, razmer) bo'yicha qoldiq
async function getRemaining(kassaId, type, razmer) {
  const map = await getStockMap(kassaId)
  const v = map.get(key(type, razmer))
  return v ? v.remaining : 0
}

module.exports = { getStockMap, getRemaining, key }
