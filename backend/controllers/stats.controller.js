const mongoose = require('mongoose')
const Sotuv   = require('../models/Sotuv')
const Atxod   = require('../models/Atxod')
const Partiya = require('../models/Partiya')
const Qarz    = require('../models/Qarz')
const FlowerType = require('../models/FlowerType')

// Asia/Tashkent = UTC+5. Server UTC da ishlashi mumkin (Render), buyurtmachi esa
// Toshkentda — kun va oy chegaralari server TZ siga qarab siljib ketmasligi kerak.
// Aks holda 31-sana kechqurun sotilgani keyingi oyga tushib qolardi.
const TZ_MS = 5 * 60 * 60 * 1000

// Toshkent bo'yicha kun boshi (00:00), UTC Date sifatida
function kunBoshi(d = new Date()) {
  const t = new Date(d.getTime() + TZ_MS)
  t.setUTCHours(0, 0, 0, 0)
  return new Date(t.getTime() - TZ_MS)
}

// Toshkent bo'yicha kalendar oy chegarasi.
// offset: 0 — shu oy (1-sanadan hozirgacha), -1 — o'tgan oy (to'liq).
// Kalendar oy ataylab, sirg'aluvchi 30 kun emas: buyurtmachi
// "farq har oyning birinchi sanasida yangilanadi" deb so'radi.
function oyChegara(offset = 0, now = new Date()) {
  const t = new Date(now.getTime() + TZ_MS)
  const y = t.getUTCFullYear(), m = t.getUTCMonth()
  return {
    $gte: new Date(Date.UTC(y, m + offset, 1) - TZ_MS),
    $lte: offset === 0
      ? new Date(now)
      : new Date(Date.UTC(y, m + offset + 1, 1) - TZ_MS - 1),
  }
}

// O'tgan oyning shu kunigacha bo'lgan qismi — halol taqqoslash uchun:
// 24 kunlik oyni to'liq oy bilan solishtirish har doim "tushib ketdi" ko'rsatadi.
function oyShuKungacha(offset = -1, now = new Date()) {
  const t = new Date(now.getTime() + TZ_MS)
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), d = t.getUTCDate()
  const oyKunlari = new Date(Date.UTC(y, m + offset + 1, 0)).getUTCDate()
  const kun = Math.min(d, oyKunlari)   // 31-mart -> fevralda 28/29
  return {
    $gte: new Date(Date.UTC(y, m + offset, 1) - TZ_MS),
    $lte: new Date(Date.UTC(y, m + offset, kun + 1) - TZ_MS - 1),
  }
}

function dateRange(period, prev = false) {
  if (period === 'jami') return {}
  const now = new Date()
  let from = new Date(), to = new Date(now)

  if (!prev) {
    if (period === 'kunlik')   { from = kunBoshi() }
    if (period === 'haftalik') { from = new Date(); from.setDate(now.getDate() - 7) }
    if (period === 'oylik')    { from = new Date(); from.setMonth(now.getMonth() - 1) }
  } else {
    if (period === 'kunlik') {
      const b = kunBoshi()
      from = new Date(b.getTime() - 86400000)
      to   = new Date(b.getTime() - 1)
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
//
// Ikkita boshqa-boshqa ko'rsatkich hisoblanadi — buyurtmachi ikkalasini ham so'radi:
//
//   savdo  — o'sha kuni QANCHA SOTILGAN (aylanma). Qarzga berilgani ham shu yerda,
//            chunki gul o'sha kuni ketgan. Sotuv sanasi bo'yicha.
//   tushum — kassaga QANCHA PUL KELGAN. Qarz faqat to'langanda tushadi
//            (eski xatti-harakat saqlanadi), to'lov sanasi bo'yicha.
//
// Ikkovini bitta raqamga qo'shib bo'lmaydi: qarzga sotilgan summa avval savdoga,
// keyin to'langanda tushumga kirardi — bir pul ikki marta sanalib ketardi.
async function calcStats(cr, kassaId = null) {
  const hasRange   = cr && Object.keys(cr).length > 0
  const byDate     = hasRange ? { createdAt: cr } : {}
  const byKassa    = kassaId ? { kassa: kassaId } : {}
  const sotuvMatch = { ...byDate, ...byKassa }
  const atxodMatch = { ...byDate, status: 'approved', ...byKassa }
  // Variant A: qarzdan tushum — to'lov qilingan sana (payments.at) bo'yicha
  const tolovMatch = { ...(hasRange ? { 'payments.at': cr } : {}), ...byKassa }

  const [sotuvAgg, atxodAgg, tolovAgg, qarzSotuvAgg] = await Promise.all([
    Sotuv.aggregate([
      { $match: sotuvMatch },
      { $group: { _id: '$tolov', summa: { $sum: '$totalPrice' }, qty: { $sum: '$qty' } } },
    ]),
    Atxod.aggregate([
      { $match: atxodMatch },
      { $group: { _id: null, qty: { $sum: '$qty' }, yoqotish: { $sum: { $multiply: ['$qiymat','$qty'] } } } },
    ]),
    Qarz.aggregate([
      { $unwind: '$payments' },
      { $match: tolovMatch },
      { $group: { _id: '$payments.usul', summa: { $sum: '$payments.amount' } } },
    ]),
    // Shu davrda qarzga sotilgani — qarz ochilgan sana bo'yicha.
    // $unwind ishlatilmaydi: u totalPrice ni har bir gul uchun takrorlab,
    // summani gul turlari soniga ko'paytirib yuborardi. Ichki $sum massiv ustidan.
    Qarz.aggregate([
      { $match: sotuvMatch },
      { $group: { _id: null, summa: { $sum: '$totalPrice' }, qty: { $sum: { $sum: '$flowers.qty' } } } },
    ]),
  ])

  // Eski yozuvlarda tolov/usul = null — ular "noma'lum" guruhiga tushadi
  const pick = (rows, key) => rows.find(r => r._id === key)?.summa ?? 0
  const sum  = rows => rows.reduce((s, r) => s + r.summa, 0)

  const sotuvJami   = sum(sotuvAgg)
  const sotildi     = sotuvAgg.reduce((s, r) => s + r.qty, 0)
  const tolovJami   = sum(tolovAgg)
  const qarzSotuv   = qarzSotuvAgg[0]?.summa ?? 0
  const qarzSotuvQty= qarzSotuvAgg[0]?.qty ?? 0

  return {
    // Tushum — kassaga kelgan haqiqiy pul (eski xatti-harakat, o'zgarmagan)
    daromad:      sotuvJami + tolovJami,
    qarzDaromad:  tolovJami,
    sotildi,
    yoqotish:     atxodAgg[0]?.yoqotish ?? 0,
    atxodQty:     atxodAgg[0]?.qty ?? 0,

    // Aylanma — shu davrda sotilgani (qarzga berilgani ham kiradi)
    savdo: {
      jami:    sotuvJami + qarzSotuv,
      naqt:    pick(sotuvAgg, 'naqt'),
      karta:   pick(sotuvAgg, 'karta'),
      qarz:    qarzSotuv,
      nomalum: pick(sotuvAgg, null),
      gullar:  sotildi + qarzSotuvQty,
    },
    // Tushum — qanday kelgani bo'yicha (qarz to'lovlari ham shu yerda)
    tushum: {
      jami:    sotuvJami + tolovJami,
      naqt:    pick(sotuvAgg, 'naqt')  + pick(tolovAgg, 'naqt'),
      karta:   pick(sotuvAgg, 'karta') + pick(tolovAgg, 'karta'),
      qarzdan: tolovJami,
      nomalum: pick(sotuvAgg, null)    + pick(tolovAgg, null),
    },
  }
}

// Gul turlari bo'yicha sotuv — Sotuv + Qarz birga.
// Qarzga berilgan gullar ham sotilgan hisoblanadi (savdo bloki bilan bir xil mantiq),
// aks holda "qaysi gul ko'p ketdi" degan javob qarzlarni ko'rmay noto'g'ri chiqardi.
async function gulTurlari(cr, kassaId = null) {
  const hasRange = cr && Object.keys(cr).length > 0
  const match = { ...(hasRange ? { createdAt: cr } : {}), ...(kassaId ? { kassa: kassaId } : {}) }

  const [sotuv, qarz] = await Promise.all([
    Sotuv.aggregate([
      { $match: match },
      { $group: {
          _id: { $trim: { input: '$flowerType' } },
          qty: { $sum: '$qty' },
          daromad: { $sum: '$totalPrice' },
      } },
    ]),
    // Bu yerda $unwind kerak — bitta qarzda bir necha tur bo'ladi.
    // Summa gulning o'z narxidan olinadi (qarzning totalPrice idan emas),
    // shuning uchun takrorlanish yo'q. Hisob qarz.controller dagi
    // flowerTotal() bilan bir xil: chegirma bo'lsa — chegirma yakuniy narx.
    Qarz.aggregate([
      { $match: match },
      { $unwind: '$flowers' },
      { $group: {
          _id: { $trim: { input: '$flowers.type' } },
          qty: { $sum: '$flowers.qty' },
          daromad: { $sum: {
            $ifNull: ['$flowers.discountPrice', { $multiply: ['$flowers.pricePerUnit', '$flowers.qty'] }],
          } },
      } },
    ]),
  ])

  const map = new Map()
  for (const r of [...sotuv, ...qarz]) {
    const cur = map.get(r._id) || { _id: r._id, qty: 0, daromad: 0 }
    cur.qty += r.qty
    cur.daromad += r.daromad
    map.set(r._id, cur)
  }
  return [...map.values()].sort((a, b) => b.daromad - a.daromad)
}

// Grafik uchun qatorlar: Sotuv + Qarz bitta seriyaga jamlanadi.
// Qarz ham kiradi — gul o'sha kuni sotilgan, faqat puli keyinroq keladi.
// Qarzda $unwind ataylab yo'q: u totalPrice ni gul turlari soniga ko'paytirib yuborardi
// (qty esa massiv ustidan ichki $sum bilan olinadi).
// timezone: '+05:00' — kun Toshkent bo'yicha ajratiladi, UTC bo'yicha emas.
async function seriesMap(fmt, from, kassaId = null) {
  const match = { createdAt: { $gte: from }, ...(kassaId ? { kassa: kassaId } : {}) }
  const grp = (daromad, qty) => ({
    $group: { _id: { $dateToString: { format: fmt, date: '$createdAt', timezone: '+05:00' } }, daromad, qty },
  })

  const [sotuv, qarz] = await Promise.all([
    Sotuv.aggregate([{ $match: match }, grp({ $sum: '$totalPrice' }, { $sum: '$qty' })]),
    Qarz.aggregate([{ $match: match }, grp({ $sum: '$totalPrice' }, { $sum: { $sum: '$flowers.qty' } })]),
  ])

  const map = {}
  for (const r of [...sotuv, ...qarz]) {
    const cur = map[r._id] || (map[r._id] = { daromad: 0, qty: 0 })
    cur.daromad += r.daromad
    cur.qty     += r.qty
  }
  return map
}

// Toshkent bo'yicha kalit — seriesMap dagi $dateToString bilan bir xil bo'lishi shart
const kunKalit = d => new Date(d.getTime() + TZ_MS).toISOString().slice(0, 10)
const oyKalit  = d => new Date(d.getTime() + TZ_MS).toISOString().slice(0, 7)

exports.adminStats = async (req, res, next) => {
  try {
    const period = req.query.period || 'kunlik'
    const cr     = dateRange(period)
    const prevCr = dateRange(period, true)
    const dateFilter     = Object.keys(cr).length     ? { createdAt: cr }     : {}
    const prevDateFilter = Object.keys(prevCr).length ? { createdAt: prevCr } : {}

    // Bu hafta (oxirgi 7 kun) — eng ko'p / eng kam sotilgan gul (sotuv + qarz)
    const weekCr = dateRange('haftalik')

    // Current + previous period basic stats in parallel
    const [cur, prev, byType, atxodBySabab, farqCount, partiyaAgg, sotuvWeek, qarzWeek, allTypes] = await Promise.all([
      calcStats(cr),
      calcStats(prevCr),
      gulTurlari(cr),
      Atxod.aggregate([
        { $match: { ...dateFilter, status: 'approved' } },
        { $group: { _id: '$sabab', qty: { $sum: '$qty' } } },
      ]),
      Partiya.countDocuments({ ...dateFilter, status: 'farq_bor' }),
      Partiya.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Sotuv.aggregate([
        { $match: { createdAt: weekCr } },
        { $group: { _id: { $trim: { input: '$flowerType' } }, qty: { $sum: '$qty' } } },
      ]),
      Qarz.aggregate([
        { $match: { createdAt: weekCr } },
        { $unwind: '$flowers' },
        { $group: { _id: { $trim: { input: '$flowers.type' } }, qty: { $sum: '$flowers.qty' } } },
      ]),
      FlowerType.find().select('name'),
    ])

    // Spravochnikdagi barcha turlar (sotilmagani 0 bilan) + haftada sotilgan boshqa nomlar
    const weekMap = new Map()
    for (const t of allTypes) weekMap.set(t.name, 0)
    for (const r of [...sotuvWeek, ...qarzWeek]) weekMap.set(r._id, (weekMap.get(r._id) || 0) + r.qty)
    const weekRows = [...weekMap.entries()]
      .map(([type, qty]) => ({ type, qty }))
      .sort((a, b) => b.qty - a.qty)

    const partiyaStats = Object.fromEntries(partiyaAgg.map(p => [p._id, p.count]))

    res.json({
      period,
      daromad:   cur.daromad,
      sotildi:   cur.sotildi,
      yoqotish:  cur.yoqotish,
      sof_foyda: cur.daromad - cur.yoqotish,
      savdo:     cur.savdo,
      tushum:    cur.tushum,
      prev: {
        daromad:  prev.daromad,
        sotildi:  prev.sotildi,
        yoqotish: prev.yoqotish,
        atxodQty: prev.atxodQty,
      },
      atxod: { qty: cur.atxodQty, by_sabab: atxodBySabab },
      farq:  { count: farqCount },
      gul_turlari: byType,
      hafta_gullar: {
        top: weekRows[0] ?? null,
        low: weekRows.length ? weekRows[weekRows.length - 1] : null,
        rows: weekRows,
      },
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
    const [cur, turlar, atxodAgg] = await Promise.all([
      calcStats(createdAt, kassaId),
      gulTurlari(createdAt, kassaId),
      Atxod.aggregate([
        { $match: { ...dateFilter, kassa: kassaId } },
        { $group: { _id: '$status', qty: { $sum: '$qty' } } },
      ]),
    ])

    res.json({
      period,
      daromad:     cur.daromad,
      qarzDaromad: cur.qarzDaromad,
      sotildi:     cur.sotildi,
      savdo:       cur.savdo,
      tushum:      cur.tushum,
      gul_turlari: turlar,
      atxod: Object.fromEntries(atxodAgg.map(a => [a._id, a.qty])),
    })
  } catch (err) {
    next(err)
  }
}

// Chart — davr bo'yicha savdo grafigi. Har nuqtada ikkala o'lchov ham bor:
// daromad (pul) va qty (gullar soni) — frontend qaysi birini chizishni o'zi tanlaydi.
// Kassa faqat o'zinikini ko'radi, admin — hammasini.
exports.chart = async (req, res, next) => {
  try {
    const type = req.query.type || 'daily'
    const now  = new Date()
    const kassaId = req.user.role === 'kassa'
      ? mongoose.Types.ObjectId.createFromHexString(req.user.id)
      : null

    // ── Kunlik: oxirgi 14 kun ──
    if (type === 'daily') {
      const from = kunBoshi(new Date(now.getTime() - 13 * 86400000))
      const map  = await seriesMap('%Y-%m-%d', from, kassaId)
      const data = []
      for (let i = 13; i >= 0; i--) {
        const key = kunKalit(new Date(now.getTime() - i * 86400000))
        data.push({ date: key, daromad: map[key]?.daromad ?? 0, qty: map[key]?.qty ?? 0 })
      }
      return res.json({ type: 'daily', data })
    }

    // ── Haftalik: oxirgi 8 hafta (kunlar haftalarga jamlanadi) ──
    if (type === 'weekly') {
      const from = kunBoshi(new Date(now.getTime() - 55 * 86400000))
      const map  = await seriesMap('%Y-%m-%d', from, kassaId)
      const data = []
      for (let w = 7; w >= 0; w--) {
        let daromad = 0, qty = 0, label = null
        for (let d = 6; d >= 0; d--) {
          const key = kunKalit(new Date(now.getTime() - (w * 7 + d) * 86400000))
          if (label === null) label = key            // hafta boshi sanasi
          daromad += map[key]?.daromad ?? 0
          qty     += map[key]?.qty ?? 0
        }
        data.push({ date: label, daromad, qty })
      }
      return res.json({ type: 'weekly', data })
    }

    // ── Oylik: oxirgi 6 oy · Jami: oxirgi 12 oy ──
    const oylar = type === 'monthly' ? 6 : 12
    const t     = new Date(now.getTime() + TZ_MS)
    const y = t.getUTCFullYear(), m = t.getUTCMonth()
    const from  = new Date(Date.UTC(y, m - (oylar - 1), 1) - TZ_MS)
    const map   = await seriesMap('%Y-%m', from, kassaId)
    const data  = []
    for (let i = oylar - 1; i >= 0; i--) {
      const key = oyKalit(new Date(Date.UTC(y, m - i, 1) - TZ_MS))
      data.push({ date: key, daromad: map[key]?.daromad ?? 0, qty: map[key]?.qty ?? 0 })
    }
    res.json({ type: type === 'monthly' ? 'monthly' : 'alltime', data })
  } catch (err) {
    next(err)
  }
}

// Eski nom — route lar buzilmasligi uchun
exports.adminChart = exports.chart

// Oylik taqqoslash — bu oy va o'tgan oy, kalendar oy bo'yicha (1-sanadan).
// Buyurtmachi so'ragani: "o'tgan oy qancha gul sotildi va bu oy bilan farqi",
// va farq har oyning birinchi sanasida noldan boshlanadi.
//
// Ikkita farq qaytadi:
//   farq         — to'liq o'tgan oyga nisbatan (buyurtmachi so'ragan raqam)
//   farqShuKunga — o'tgan oyning shu kunigacha bo'lgan qismiga nisbatan.
// Ikkinchisi kerak: oy boshida 3 kunni to'liq oy bilan solishtirish
// har doim "-90%" ko'rsatib, hech qanday ma'no bermaydi.
exports.oyTaqqos = async (req, res, next) => {
  try {
    const now = new Date()
    const kassaId = req.user.role === 'kassa'
      ? mongoose.Types.ObjectId.createFromHexString(req.user.id)
      : null

    const [cur, prev, prevQisman] = await Promise.all([
      calcStats(oyChegara(0, now), kassaId),
      calcStats(oyChegara(-1, now), kassaId),
      calcStats(oyShuKungacha(-1, now), kassaId),
    ])

    // Oy raqami Toshkent bo'yicha — nomini frontend qo'yadi (UZ_MONTHS)
    const t = new Date(now.getTime() + TZ_MS)
    const y = t.getUTCFullYear(), m = t.getUTCMonth()
    const otgan = new Date(Date.UTC(y, m - 1, 1))

    const farq = (a, b) => ({
      qiymat: a - b,
      foiz:   b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100),
    })

    res.json({
      buOy: {
        oy: m, yil: y,
        kun:    t.getUTCDate(),                                  // oyning nechanchi kuni
        savdo:  cur.savdo.jami,
        gullar: cur.savdo.gullar,
        tushum: cur.tushum.jami,
      },
      otganOy: {
        oy: otgan.getUTCMonth(), yil: otgan.getUTCFullYear(),
        kunlar: new Date(Date.UTC(y, m, 0)).getUTCDate(),         // o'tgan oyda nechta kun bo'lgan
        savdo:  prev.savdo.jami,
        gullar: prev.savdo.gullar,
        tushum: prev.tushum.jami,
      },
      otganOyShuKunga: { savdo: prevQisman.savdo.jami, gullar: prevQisman.savdo.gullar },
      farq: {
        savdo:  farq(cur.savdo.jami,   prev.savdo.jami),
        gullar: farq(cur.savdo.gullar, prev.savdo.gullar),
      },
      farqShuKunga: {
        savdo:  farq(cur.savdo.jami,   prevQisman.savdo.jami),
        gullar: farq(cur.savdo.gullar, prevQisman.savdo.gullar),
      },
    })
  } catch (err) {
    next(err)
  }
}
