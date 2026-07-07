const mongoose = require('mongoose')
const Sotuv   = require('../models/Sotuv')
const Atxod   = require('../models/Atxod')
const Partiya = require('../models/Partiya')
const Qarz    = require('../models/Qarz')

function dateRange(period, prev = false) {
  if (period === 'jami') return {}
  const now = new Date()
  let from = new Date(), to = new Date(now)

  if (!prev) {
    if (period === 'kunlik')   { from = new Date(); from.setHours(0,0,0,0) }
    if (period === 'haftalik') { from = new Date(); from.setDate(now.getDate() - 7) }
    if (period === 'oylik')    { from = new Date(); from.setMonth(now.getMonth() - 1) }
  } else {
    if (period === 'kunlik') {
      from = new Date(); from.setDate(from.getDate()-1); from.setHours(0,0,0,0)
      to   = new Date(); to.setDate(to.getDate()-1);     to.setHours(23,59,59,999)
    }
    if (period === 'haftalik') {
      from = new Date(); from.setDate(from.getDate()-14)
      to   = new Date(); to.setDate(to.getDate()-7)
    }
    if (period === 'oylik') {
      from = new Date(); from.setMonth(from.getMonth()-2)
      to   = new Date(); to.setMonth(to.getMonth()-1)
    }
  }
  return { $gte: from, $lte: to }
}

// cr — sana diapazoni ({ $gte, $lte }) yoki {} (jami)
async function calcStats(cr, kassaId = null) {
  const hasRange   = cr && Object.keys(cr).length > 0
  const sotuvMatch = { ...(hasRange ? { createdAt: cr } : {}), ...(kassaId ? { kassa: kassaId } : {}) }
  const atxodMatch = { ...(hasRange ? { createdAt: cr } : {}), status: 'approved', ...(kassaId ? { kassa: kassaId } : {}) }
  // Variant A: qarzdan tushum — to'lov qilingan sana (payments.at) bo'yicha
  const qarzMatch  = { ...(hasRange ? { 'payments.at': cr } : {}), ...(kassaId ? { kassa: kassaId } : {}) }

  const [sotuvAgg, atxodAgg, qarzAgg] = await Promise.all([
    Sotuv.aggregate([
      { $match: sotuvMatch },
      { $group: { _id: null, daromad: { $sum: '$totalPrice' }, sotildi: { $sum: '$qty' } } },
    ]),
    Atxod.aggregate([
      { $match: atxodMatch },
      { $group: { _id: null, qty: { $sum: '$qty' }, yoqotish: { $sum: { $multiply: ['$qiymat','$qty'] } } } },
    ]),
    Qarz.aggregate([
      { $unwind: '$payments' },
      { $match: qarzMatch },
      { $group: { _id: null, qarzDaromad: { $sum: '$payments.amount' } } },
    ]),
  ])
  return {
    daromad:      (sotuvAgg[0]?.daromad ?? 0) + (qarzAgg[0]?.qarzDaromad ?? 0),
    qarzDaromad:  qarzAgg[0]?.qarzDaromad ?? 0,
    sotildi:      sotuvAgg[0]?.sotildi ?? 0,
    yoqotish:     atxodAgg[0]?.yoqotish ?? 0,
    atxodQty:     atxodAgg[0]?.qty ?? 0,
  }
}

exports.adminStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'kunlik'
    const cr     = dateRange(period)
    const prevCr = dateRange(period, true)
    const dateFilter     = Object.keys(cr).length     ? { createdAt: cr }     : {}
    const prevDateFilter = Object.keys(prevCr).length ? { createdAt: prevCr } : {}

    // Current + previous period basic stats in parallel
    const [cur, prev, byType, atxodBySabab, farqCount, partiyaAgg] = await Promise.all([
      calcStats(cr),
      calcStats(prevCr),
      Sotuv.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$flowerType', qty: { $sum: '$qty' }, daromad: { $sum: '$totalPrice' } } },
        { $sort: { daromad: -1 } },
      ]),
      Atxod.aggregate([
        { $match: { ...dateFilter, status: 'approved' } },
        { $group: { _id: '$sabab', qty: { $sum: '$qty' } } },
      ]),
      Partiya.countDocuments({ ...dateFilter, status: 'farq_bor' }),
      Partiya.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const partiyaStats = Object.fromEntries(partiyaAgg.map(p => [p._id, p.count]))

    res.json({
      period,
      daromad:   cur.daromad,
      sotildi:   cur.sotildi,
      yoqotish:  cur.yoqotish,
      sof_foyda: cur.daromad - cur.yoqotish,
      prev: {
        daromad:  prev.daromad,
        sotildi:  prev.sotildi,
        yoqotish: prev.yoqotish,
        atxodQty: prev.atxodQty,
      },
      atxod: { qty: cur.atxodQty, by_sabab: atxodBySabab },
      farq:  { count: farqCount },
      gul_turlari: byType,
      partiyalar: {
        jami:          (partiyaStats.yolda ?? 0) + (partiyaStats.qabul_qilindi ?? 0) + (partiyaStats.farq_bor ?? 0),
        yolda:         partiyaStats.yolda ?? 0,
        qabul_qilindi: partiyaStats.qabul_qilindi ?? 0,
        farq_bor:      partiyaStats.farq_bor ?? 0,
      },
    })
  } catch (err) {
    next(err)
  }
}

exports.kassaStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'kunlik'
    const createdAt = dateRange(period)
    const dateFilter = Object.keys(createdAt).length ? { createdAt } : {}
    // aggregate avtomatik cast qilmaydi — string id ni ObjectId ga o'tkazamiz
    const kassaId = mongoose.Types.ObjectId.createFromHexString(req.user.id)

    // daromad (odi sotuv + qarz to'lovlari) va sotildi — calcStats orqali
    const cur = await calcStats(createdAt, kassaId)

    const atxodAgg = await Atxod.aggregate([
      { $match: { ...dateFilter, kassa: kassaId } },
      { $group: { _id: '$status', qty: { $sum: '$qty' } } },
    ])

    res.json({
      period,
      daromad:     cur.daromad,
      qarzDaromad: cur.qarzDaromad,
      sotildi:     cur.sotildi,
      atxod: Object.fromEntries(atxodAgg.map(a => [a._id, a.qty])),
    })
  } catch (err) {
    next(err)
  }
}

// Chart — period bo'yicha daromad grafigi
exports.adminChart = async (req, res, next) => {
  try {
    const type = req.query.type || 'daily'
    const now  = new Date()

    // ── Kunlik: oxirgi 14 kun ──
    if (type === 'daily') {
      const from = new Date(now); from.setDate(from.getDate() - 13); from.setHours(0,0,0,0)
      const rows = await Sotuv.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } },
        { $sort: { _id: 1 } },
      ])
      const map = Object.fromEntries(rows.map(r => [r._id, r]))
      const result = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        result.push({ date: key, daromad: map[key]?.daromad ?? 0, qty: map[key]?.qty ?? 0 })
      }
      return res.json({ type: 'daily', data: result })
    }

    // ── Haftalik: oxirgi 8 hafta ──
    if (type === 'weekly') {
      const from = new Date(now); from.setDate(from.getDate() - 55); from.setHours(0,0,0,0)
      const rows = await Sotuv.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } },
        { $sort: { _id: 1 } },
      ])
      const dayMap = Object.fromEntries(rows.map(r => [r._id, r]))
      // Haftalarga guruhlash (8 hafta)
      const result = []
      for (let w = 7; w >= 0; w--) {
        let weekDaromad = 0, weekQty = 0
        let weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - w * 7 - 6)
        let weekEnd   = new Date(now); weekEnd.setDate(weekEnd.getDate() - w * 7)
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10)
          weekDaromad += dayMap[key]?.daromad ?? 0
          weekQty     += dayMap[key]?.qty ?? 0
        }
        // Label: hafta boshi sanasi
        const label = weekStart.toISOString().slice(0, 10)
        result.push({ date: label, daromad: weekDaromad, qty: weekQty })
      }
      return res.json({ type: 'weekly', data: result })
    }

    // ── Oylik: oxirgi 6 oy ──
    if (type === 'monthly') {
      const from = new Date(now); from.setMonth(from.getMonth() - 5); from.setDate(1); from.setHours(0,0,0,0)
      const rows = await Sotuv.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } },
        { $sort: { _id: 1 } },
      ])
      const map = Object.fromEntries(rows.map(r => [r._id, r]))
      const result = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now); d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        result.push({ date: key, daromad: map[key]?.daromad ?? 0, qty: map[key]?.qty ?? 0 })
      }
      return res.json({ type: 'monthly', data: result })
    }

    // ── Jami: oxirgi 12 oy ──
    const from = new Date(now); from.setFullYear(from.getFullYear() - 1); from.setDate(1); from.setHours(0,0,0,0)
    const rows = await Sotuv.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } },
      { $sort: { _id: 1 } },
    ])
    const map = Object.fromEntries(rows.map(r => [r._id, r]))
    const result = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result.push({ date: key, daromad: map[key]?.daromad ?? 0, qty: map[key]?.qty ?? 0 })
    }
    res.json({ type: 'alltime', data: result })
  } catch (err) {
    next(err)
  }
}
