const Qarz = require('../models/Qarz')

// FormData ichida flowers JSON string bo'lib keladi
function parseFlowers(raw) {
  let arr
  try { arr = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null }
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
    flowers.push({ type, razmer, qty, pricePerUnit: price })
  }
  return flowers
}

// POST /api/qarz — kassa qarzga sotadi (2 rasm: flowerPhoto + buyerPhoto)
exports.create = async (req, res, next) => {
  try {
    const flowers = parseFlowers(req.body.flowers)
    if (!flowers)
      return res.status(400).json({ message: "Gullar ma'lumoti noto'g'ri kiritilgan" })

    const name  = (req.body.buyerName  || '').trim()
    const phone = (req.body.buyerPhone || '').trim()
    if (!name)  return res.status(400).json({ message: 'Sotib oluvchi ismi shart' })
    if (!phone) return res.status(400).json({ message: 'Telefon raqami shart' })

    const flowerPhoto = req.files?.flowerPhoto?.[0]?.path || null
    const buyerPhoto  = req.files?.buyerPhoto?.[0]?.path  || null
    if (!flowerPhoto) return res.status(400).json({ message: 'Gul rasmi shart' })
    if (!buyerPhoto)  return res.status(400).json({ message: 'Sotib oluvchi rasmi shart' })

    const totalPrice = flowers.reduce((s, f) => s + f.pricePerUnit * f.qty, 0)

    const qarz = await Qarz.create({
      kassa: req.user.id,
      flowers,
      flowerPhoto,
      buyer: { name, phone, photo: buyerPhoto },
      totalPrice,
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

// PATCH /api/qarz/:id/tolov { amount } — to'liq yoki bo'lib to'lash
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

    qarz.payments.push({ amount, at: new Date() })
    qarz.paidAmount += amount
    if (qarz.paidAmount >= qarz.totalPrice) {
      qarz.isPaid = true
      qarz.paidAt = new Date()
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
