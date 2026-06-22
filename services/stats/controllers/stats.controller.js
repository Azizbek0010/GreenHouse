const mongoose = require('mongoose')
const Sotuv    = require('../models/Sotuv')
const Atxod    = require('../models/Atxod')
const Partiya  = require('../models/Partiya')

function dateRange(period, prev = false) {
  if (period === 'jami') return {}
  const now = new Date(); let from = new Date(), to = new Date(now)
  if (!prev) {
    if (period === 'kunlik')   { from = new Date(); from.setHours(0,0,0,0) }
    if (period === 'haftalik') { from = new Date(); from.setDate(now.getDate()-7) }
    if (period === 'oylik')    { from = new Date(); from.setMonth(now.getMonth()-1) }
  } else {
    if (period === 'kunlik')   { from = new Date(); from.setDate(from.getDate()-1); from.setHours(0,0,0,0); to = new Date(); to.setDate(to.getDate()-1); to.setHours(23,59,59,999) }
    if (period === 'haftalik') { from = new Date(); from.setDate(from.getDate()-14); to = new Date(); to.setDate(to.getDate()-7) }
    if (period === 'oylik')    { from = new Date(); from.setMonth(from.getMonth()-2); to = new Date(); to.setMonth(to.getMonth()-1) }
  }
  return { $gte: from, $lte: to }
}

async function calcStats(df) {
  const [s, a] = await Promise.all([
    Sotuv.aggregate([{ $match: df }, { $group: { _id: null, daromad: { $sum: '$totalPrice' }, sotildi: { $sum: '$qty' } } }]),
    Atxod.aggregate([{ $match: { ...df, status: 'approved' } }, { $group: { _id: null, qty: { $sum: '$qty' }, yoqotish: { $sum: { $multiply: ['$qiymat','$qty'] } } } }]),
  ])
  return { daromad: s[0]?.daromad??0, sotildi: s[0]?.sotildi??0, yoqotish: a[0]?.yoqotish??0, atxodQty: a[0]?.qty??0 }
}

exports.adminStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'kunlik'
    const cr = dateRange(period), prevCr = dateRange(period, true)
    const df = Object.keys(cr).length ? { createdAt: cr } : {}
    const pdf = Object.keys(prevCr).length ? { createdAt: prevCr } : {}

    const [cur, prev, byType, atxodBySabab, farqCount, partiyaAgg] = await Promise.all([
      calcStats(df), calcStats(pdf),
      Sotuv.aggregate([{ $match: df }, { $group: { _id: '$flowerType', qty: { $sum: '$qty' }, daromad: { $sum: '$totalPrice' } } }, { $sort: { daromad: -1 } }]),
      Atxod.aggregate([{ $match: { ...df, status: 'approved' } }, { $group: { _id: '$sabab', qty: { $sum: '$qty' } } }]),
      Partiya.countDocuments({ ...df, status: 'farq_bor' }),
      Partiya.aggregate([{ $match: df }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ])

    const ps = Object.fromEntries(partiyaAgg.map(p => [p._id, p.count]))
    res.json({
      period, daromad: cur.daromad, sotildi: cur.sotildi, yoqotish: cur.yoqotish, sof_foyda: cur.daromad - cur.yoqotish,
      prev: { daromad: prev.daromad, sotildi: prev.sotildi, yoqotish: prev.yoqotish, atxodQty: prev.atxodQty },
      atxod: { qty: cur.atxodQty, by_sabab: atxodBySabab },
      farq: { count: farqCount },
      gul_turlari: byType,
      partiyalar: { jami: (ps.yolda??0)+(ps.qabul_qilindi??0)+(ps.farq_bor??0), yolda: ps.yolda??0, qabul_qilindi: ps.qabul_qilindi??0, farq_bor: ps.farq_bor??0 },
    })
  } catch (err) { next(err) }
}

exports.kassaStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'kunlik'
    const cr = dateRange(period)
    const df = Object.keys(cr).length ? { createdAt: cr } : {}
    const kassaId = mongoose.Types.ObjectId.createFromHexString(req.user.id)
    const [s, a] = await Promise.all([
      Sotuv.aggregate([{ $match: { ...df, kassa: kassaId } }, { $group: { _id: null, daromad: { $sum: '$totalPrice' }, sotildi: { $sum: '$qty' } } }]),
      Atxod.aggregate([{ $match: { ...df, kassa: kassaId } }, { $group: { _id: '$status', qty: { $sum: '$qty' } } }]),
    ])
    res.json({ period, daromad: s[0]?.daromad??0, sotildi: s[0]?.sotildi??0, atxod: Object.fromEntries(a.map(x => [x._id, x.qty])) })
  } catch (err) { next(err) }
}

exports.adminChart = async (req, res, next) => {
  try {
    const type = req.query.type || 'daily'
    const now  = new Date()

    if (type === 'daily') {
      const from = new Date(now); from.setDate(from.getDate()-13); from.setHours(0,0,0,0)
      const rows = await Sotuv.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } }, { $sort: { _id: 1 } }])
      const map = Object.fromEntries(rows.map(r => [r._id, r]))
      const result = []
      for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); const k = d.toISOString().slice(0,10); result.push({ date: k, daromad: map[k]?.daromad??0, qty: map[k]?.qty??0 }) }
      return res.json({ type: 'daily', data: result })
    }

    if (type === 'weekly') {
      const from = new Date(now); from.setDate(from.getDate()-55); from.setHours(0,0,0,0)
      const rows = await Sotuv.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } }, { $sort: { _id: 1 } }])
      const dayMap = Object.fromEntries(rows.map(r => [r._id, r]))
      const result = []
      for (let w = 7; w >= 0; w--) {
        let wd = 0, wq = 0
        const ws = new Date(now); ws.setDate(ws.getDate()-w*7-6)
        const we = new Date(now); we.setDate(we.getDate()-w*7)
        for (let d = new Date(ws); d <= we; d.setDate(d.getDate()+1)) { const k = d.toISOString().slice(0,10); wd += dayMap[k]?.daromad??0; wq += dayMap[k]?.qty??0 }
        result.push({ date: ws.toISOString().slice(0,10), daromad: wd, qty: wq })
      }
      return res.json({ type: 'weekly', data: result })
    }

    if (type === 'monthly') {
      const from = new Date(now); from.setMonth(from.getMonth()-5); from.setDate(1); from.setHours(0,0,0,0)
      const rows = await Sotuv.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } }, { $sort: { _id: 1 } }])
      const map = Object.fromEntries(rows.map(r => [r._id, r]))
      const result = []
      for (let i = 5; i >= 0; i--) { const d = new Date(now); d.setMonth(d.getMonth()-i); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; result.push({ date: k, daromad: map[k]?.daromad??0, qty: map[k]?.qty??0 }) }
      return res.json({ type: 'monthly', data: result })
    }

    const from = new Date(now); from.setFullYear(from.getFullYear()-1); from.setDate(1); from.setHours(0,0,0,0)
    const rows = await Sotuv.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, daromad: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } }, { $sort: { _id: 1 } }])
    const map = Object.fromEntries(rows.map(r => [r._id, r]))
    const result = []
    for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setMonth(d.getMonth()-i); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; result.push({ date: k, daromad: map[k]?.daromad??0, qty: map[k]?.qty??0 }) }
    res.json({ type: 'alltime', data: result })
  } catch (err) { next(err) }
}
