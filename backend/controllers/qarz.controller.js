const Qarz = require('../models/Qarz')
const { resolveSana, sanaFields, resolveSanaForEdit, forceCreatedAt } = require('../utils/sana')
const { tolovBoshlangich, tolovQarz } = require('../utils/tolov')

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

    const totalPrice = flowers.reduce((s, f) => s + flowerTotal(f), 0)

    // Boshlang'ich to'lov (ixtiyoriy): mijoz 300 lik gulni oldi, 100 karta +
    // 100 naqt berdi, 100 qarz qoldi. Pul o'sha kuni kelgani uchun payments ga
    // tushadi — daromad/tushum hisobi o'zgarishsiz to'g'ri ishlaydi.
    const b = tolovBoshlangich(req.body, totalPrice)
    if (b.error) return res.status(400).json({ message: b.error })

    const at = s.createdAt || new Date()
    const payments = [
      ...(b.naqt  > 0 ? [{ amount: b.naqt,  at, usul: 'naqt',  boshlangich: true }] : []),
      ...(b.karta > 0 ? [{ amount: b.karta, at, usul: 'karta', boshlangich: true }] : []),
    ]

    const qarz = await Qarz.create({
      kassa: req.user.id,
      flowers,
      buyer: { name, phone },
      totalPrice,
      payments,
      paidAmount: b.jami,
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

    // Sotuv sanasi (createdAt) — admin xato sana qo'ygan bo'lsa tuzatadi.
    // Faqat validatsiya; createdAt immutable, save dan keyin majburlanadi (pastda).
    const sanaEdit = resolveSanaForEdit(req.body.sana)
    if (sanaEdit.error) return res.status(400).json({ message: sanaEdit.error })

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
        const usul = p.usul ?? null
        if (usul !== null && !['naqt', 'karta'].includes(usul))
          return res.status(400).json({ message: "To'lov usuli noto'g'ri" })
        // boshlangich saqlanadi: massiv butunlay almashtiriladi, flag yo'qolsa
        // aralash sotuv statistikada oddiy qarzga aylanib qolardi
        payments.push({ amount, at, usul, boshlangich: !!p.boshlangich })
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
    if (!sanaEdit.skip) await forceCreatedAt(Qarz, qarz, sanaEdit)
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

    // Bir to'lovda ikki usul bo'lishi mumkin (100 karta + 100 naqt) — u holda
    // payments ga ikki yozuv tushadi, har birida bitta usul. Statistika
    // payments.usul bo'yicha guruhlaydi, bo'linish o'zi to'g'ri chiqadi.
    const t = tolovQarz(req.body, remaining)
    if (t.error) return res.status(400).json({ message: t.error })

    // Ixtiyoriy sana: tanlanmasa — hozirgi vaqt.
    // Bu yerda sana muhim: daromad payments[].at bo'yicha hisoblanadi (stats.controller.js),
    // ya'ni fevralda to'langan pul fevral daromadiga tushishi kerak.
    const s = resolveSana(req.body.sana)
    if (s.error) return res.status(400).json({ message: s.error })
    const at = s.createdAt || new Date()
    if (at < qarz.createdAt)
      return res.status(400).json({ message: "To'lov sanasi qarz sanasidan oldin bo'lishi mumkin emas" })

    for (const q of t.qismlar) qarz.payments.push({ ...q, at, boshlangich: false })
    qarz.payments.sort((a, b) => a.at - b.at)
    qarz.paidAmount += t.jami
    if (qarz.paidAmount >= qarz.totalPrice) {
      qarz.isPaid = true
      qarz.paidAt = qarz.payments.at(-1).at   // eng oxirgi to'lov sanasi
    }
    await qarz.save()

    const io = req.app.get('io')
    io.to('admin').emit('qarz_tolov', {
      kassa:  req.user.name,
      buyer:  qarz.buyer.name,
      amount: t.jami,
      isPaid: qarz.isPaid,
    })

    res.json(qarz)
  } catch (err) {
    next(err)
  }
}
