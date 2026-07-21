const Qarz = require('../models/Qarz')
const { getStockMap, key } = require('../utils/stock')
const { resolveSana, sanaFields } = require('../utils/sana')

function parseFlowers(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null

  const flowers = []
  for (const f of arr) {
    const type   = f.type
    const razmer = Number(f.razmer)
    const qty    = Number(f.qty)
    const price  = Number(f.pricePerUnit)
    if (!type || !Number.isFinite(razmer) || razmer <= 0 ||
        !Number.isInteger(qty) || qty <= 0 ||
        !Number.isFinite(price) || price <= 0) return null

    let discountPrice = null
    if (f.discountPrice != null && f.discountPrice !== '') {
      discountPrice = Number(f.discountPrice)
      if (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice > price * qty) return null
    }

    flowers.push({ type, razmer, qty, pricePerUnit: price, discountPrice })
  }
  return flowers
}

function flowerTotal(f) {
  return f.discountPrice != null ? f.discountPrice : f.pricePerUnit * f.qty
}

// POST /api/qarz — kassa qarzga sotadi
exports.create = async (req, res, next) => {
  try {
    const flowers = parseFlowers(req.body.flowers)
    if (!flowers)
      return res.status(400).json({ message: "Gullar ma'lumoti noto'g'ri kiritilgan" })

    const name  = (req.body.buyerName  || '').trim()
    const phone = (req.body.buyerPhone || '').trim()
    if (!name)  return res.status(400).json({ message: 'Sotib oluvchi ismi shart' })
    if (!phone) return res.status(400).json({ message: 'Telefon raqami shart' })

    // Ixtiyoriy sana: tanlanmasa — hozirgi vaqt
    const s = resolveSana(req.body.sana)
    if (s.error) return res.status(400).json({ message: s.error })

    // Ombor limiti: har bir (tur, razmer) bo'yicha jami so'ralgan soni qoldiqdan oshmasin
    const stock = await getStockMap(req.user.id)
    const need  = new Map()
    for (const f of flowers) {
      const k = key(f.type, f.razmer)
      need.set(k, (need.get(k) || 0) + f.qty)
    }
    for (const [k, qty] of need) {
      const have = stock.get(k) ? stock.get(k).remaining : 0
      if (qty > have) {
        const [t, sm] = k.split('|')
        return res.status(400).json({ message: `Omborda ${t} ${sm}sm dan faqat ${Math.max(have, 0)} ta qolgan` })
      }
    }

    const totalPrice = flowers.reduce((s, f) => s + flowerTotal(f), 0)

    const qarz = await Qarz.create({
      kassa: req.user.id,
      flowers,
      buyer: { name, phone },
      totalPrice,
      ...sanaFields(s),
    })

    const io = req.app.get('io')
    io.to('admin').emit('yangi_qarz', {
      kassa:      req.user.name,
      buyer:      name,
      totalPrice: qarz.totalPrice,
    })

    res.status(201).json(qarz)
  } catch (err) {
    next(err)
  }
}

// GET /api/qarz?status=open|paid|all — kassa o'zinikini, admin hammasini
exports.getAll = async (req, res, next) => {
  try {
    const filter = {}
    if (req.user.role === 'kassa') filter.kassa = req.user.id

    const { status, from, to } = req.query
    if (status === 'open') filter.isPaid = false
    if (status === 'paid') filter.isPaid = true

    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to)   filter.createdAt.$lte = new Date(to)
    }

    const qarzlar = await Qarz.find(filter)
      .populate('kassa', 'name')
      .sort({ createdAt: -1 })

    // Qoldiq (remaining) va to'langan summalar bo'yicha jamlar
    const totalQarz   = qarzlar.reduce((s, q) => s + q.totalPrice, 0)
    const totalPaid   = qarzlar.reduce((s, q) => s + q.paidAmount, 0)
    const qoldiq      = totalQarz - totalPaid

    res.json({ qarzlar, totalQarz, totalPaid, qoldiq })
  } catch (err) {
    next(err)
  }
}

exports.getOne = async (req, res, next) => {
  try {
    const qarz = await Qarz.findById(req.params.id).populate('kassa', 'name')
    if (!qarz) return res.status(404).json({ message: 'Topilmadi' })
    res.json(qarz)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/qarz/:id — admin qarzni to'liq tahrirlaydi (gullar, xaridor, to'lovlar)
exports.adminUpdate = async (req, res, next) => {
  try {
    const qarz = await Qarz.findById(req.params.id)
    if (!qarz) return res.status(404).json({ message: 'Topilmadi' })

    if (req.body.flowers !== undefined) {
      const flowers = parseFlowers(req.body.flowers)
      if (!flowers)
        return res.status(400).json({ message: "Gullar ma'lumoti noto'g'ri kiritilgan" })
      qarz.flowers = flowers
      qarz.totalPrice = flowers.reduce((s, f) => s + flowerTotal(f), 0)
    }

    if (req.body.buyerName !== undefined) {
      const name = (req.body.buyerName || '').trim()
      if (!name) return res.status(400).json({ message: 'Sotib oluvchi ismi shart' })
      qarz.buyer.name = name
    }
    if (req.body.buyerPhone !== undefined) {
      const phone = (req.body.buyerPhone || '').trim()
      if (!phone) return res.status(400).json({ message: 'Telefon raqami shart' })
      qarz.buyer.phone = phone
    }

    if (req.body.payments !== undefined) {
      if (!Array.isArray(req.body.payments))
        return res.status(400).json({ message: "To'lovlar ro'yxati noto'g'ri" })
      const payments = []
      for (const p of req.body.payments) {
        const amount = Number(p.amount)
        const at = p.at ? new Date(p.at) : new Date()
        if (!Number.isFinite(amount) || amount <= 0 || isNaN(at.getTime()))
          return res.status(400).json({ message: "To'lov summasi yoki sanasi noto'g'ri" })
        payments.push({ amount, at })
      }
      payments.sort((a, b) => a.at - b.at)
      qarz.payments = payments
    }

    // paidAmount / isPaid / paidAt har doim qayta hisoblanadi
    // (flowers o'zgarsa totalPrice o'zgaradi — holat ham o'zgarishi mumkin)
    qarz.paidAmount = qarz.payments.reduce((s, p) => s + p.amount, 0)
    if (qarz.paidAmount > qarz.totalPrice)
      return res.status(400).json({ message: `To'langan summa (${qarz.paidAmount}) umumiy qarzdan (${qarz.totalPrice}) oshib ketdi` })
    qarz.isPaid = qarz.paidAmount >= qarz.totalPrice
    qarz.paidAt = qarz.isPaid ? (qarz.payments[qarz.payments.length - 1]?.at ?? new Date()) : null

    await qarz.save()
    await qarz.populate('kassa', 'name')
    res.json(qarz)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/qarz/:id — admin o'chiradi (to'lov daromadi ham statistikadan yo'qoladi)
exports.adminDelete = async (req, res, next) => {
  try {
    const qarz = await Qarz.findByIdAndDelete(req.params.id)
    if (!qarz) return res.status(404).json({ message: 'Topilmadi' })
    res.json({ message: "Qarz o'chirildi", id: qarz._id })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/qarz/:id/tolov { amount, sana? } — to'liq yoki bo'lib to'lash
exports.tolov = async (req, res, next) => {
  try {
    const qarz = await Qarz.findById(req.params.id)
    if (!qarz) return res.status(404).json({ message: 'Topilmadi' })
    if (req.user.role === 'kassa' && String(qarz.kassa) !== String(req.user.id))
      return res.status(403).json({ message: 'Bu qarz sizga tegishli emas' })
    if (qarz.isPaid) return res.status(400).json({ message: 'Qarz allaqachon yopilgan' })

    const remaining = qarz.totalPrice - qarz.paidAmount
    const amount = Number(req.body.amount)
    if (!Number.isFinite(amount) || amount <= 0)
      return res.status(400).json({ message: "To'lov summasi noto'g'ri" })
    if (amount > remaining)
      return res.status(400).json({ message: `To'lov qoldiqdan (${remaining}) oshib ketdi` })

    // Ixtiyoriy sana: tanlanmasa — hozirgi vaqt.
    // Bu yerda sana muhim: daromad payments[].at bo'yicha hisoblanadi (stats.controller.js),
    // ya'ni fevralda to'langan pul fevral daromadiga tushishi kerak.
    const s = resolveSana(req.body.sana)
    if (s.error) return res.status(400).json({ message: s.error })
    const at = s.createdAt || new Date()
    if (at < qarz.createdAt)
      return res.status(400).json({ message: "To'lov sanasi qarz sanasidan oldin bo'lishi mumkin emas" })

    qarz.payments.push({ amount, at })
    qarz.payments.sort((a, b) => a.at - b.at)
    qarz.paidAmount += amount
    if (qarz.paidAmount >= qarz.totalPrice) {
      qarz.isPaid = true
      qarz.paidAt = qarz.payments.at(-1).at   // eng oxirgi to'lov sanasi
    }
    await qarz.save()

    const io = req.app.get('io')
    io.to('admin').emit('qarz_tolov', {
      kassa:  req.user.name,
      buyer:  qarz.buyer.name,
      amount,
      isPaid: qarz.isPaid,
    })

    res.json(qarz)
  } catch (err) {
    next(err)
  }
}
