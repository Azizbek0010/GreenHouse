const Partiya = require('../models/Partiya')
const User    = require('../models/User')
const emit    = require('../utils/emit')

function validateFlowers(flowers) {
  if (!Array.isArray(flowers) || flowers.length === 0) return 'Kamida bitta gul kiritilishi shart'
  for (const f of flowers) {
    if (!f.type || !Array.isArray(f.sizes) || f.sizes.length === 0)
      return "Har bir gulda tur va kamida bitta razmer bo'lishi shart"
    for (const s of f.sizes)
      if (!Number.isFinite(s.sm) || s.sm <= 0 || !Number.isInteger(s.qty) || s.qty <= 0)
        return "Razmer (sm) va soni musbat son bo'lishi kerak"
  }
  return null
}

function calcFarq(sent, received) {
  const farq = []
  for (const sf of sent) {
    const rf = received.find(r => r.type === sf.type)
    for (const ss of sf.sizes) {
      const rs = rf?.sizes.find(s => s.sm === ss.sm)
      const diff = (rs?.qty ?? 0) - ss.qty
      if (diff !== 0) farq.push({ type: sf.type, sm: ss.sm, sent: ss.qty, received: rs?.qty ?? 0, diff })
    }
  }
  for (const rf of received) {
    const sf = sent.find(s => s.type === rf.type)
    for (const rs of rf.sizes) {
      if (!sf?.sizes.find(s => s.sm === rs.sm))
        farq.push({ type: rf.type, sm: rs.sm, sent: 0, received: rs.qty, diff: rs.qty })
    }
  }
  return farq
}

exports.create = async (req, res, next) => {
  try {
    const sentPhoto = req.file ? `/uploads/partiya/${req.file.filename}` : null
    if (!sentPhoto) return res.status(400).json({ message: 'Rasm majburiy' })

    let flowers = req.body.flowers
    if (typeof flowers === 'string') {
      try { flowers = JSON.parse(flowers) }
      catch { return res.status(400).json({ message: "flowers noto'g'ri formatda" }) }
    }

    const { kassaId } = req.body
    const err = validateFlowers(flowers)
    if (err) return res.status(400).json({ message: err })

    const kassa = await User.findById(kassaId)
    if (!kassa || kassa.role !== 'kassa') return res.status(400).json({ message: 'Kassa topilmadi' })

    const partiya = await Partiya.create({ teplitsa: req.user.id, kassa: kassaId, sent: flowers, sentPhoto })

    await emit(`user_${kassaId}`, 'yangi_partiya', { batchId: partiya.batchId, teplitsa: req.user.name, message: "Yangi partiya yo'lda!" })
    await emit('admin', 'partiya_yangilandi', { batchId: partiya.batchId, status: 'yolda', teplitsa: req.user.name, sentPhoto })

    res.status(201).json(partiya)
  } catch (err) { next(err) }
}

exports.receive = async (req, res, next) => {
  try {
    const photo = req.file ? `/uploads/partiya/${req.file.filename}` : null
    if (!photo) return res.status(400).json({ message: 'Rasm majburiy' })

    let flowers = req.body.flowers
    if (typeof flowers === 'string') {
      try { flowers = JSON.parse(flowers) }
      catch { return res.status(400).json({ message: "flowers noto'g'ri formatda" }) }
    }
    const err = validateFlowers(flowers)
    if (err) return res.status(400).json({ message: err })

    const partiya = await Partiya.findById(req.params.id)
    if (!partiya) return res.status(404).json({ message: 'Partiya topilmadi' })
    if (partiya.kassa.toString() !== req.user.id) return res.status(403).json({ message: 'Bu partiya sizga yuborilmagan' })
    if (partiya.status !== 'yolda') return res.status(400).json({ message: 'Partiya allaqachon qabul qilingan' })

    partiya.received = flowers
    partiya.photo    = photo
    partiya.farq     = calcFarq(partiya.sent, flowers)
    partiya.status   = partiya.farq.length > 0 ? 'farq_bor' : 'qabul_qilindi'
    await partiya.save()

    await emit('admin', 'partiya_yangilandi', { batchId: partiya.batchId, status: partiya.status, farq: partiya.farq })
    await emit(`user_${partiya.teplitsa}`, 'partiya_qabul', { batchId: partiya.batchId, status: 'qabul_qilindi' })

    const { sent, farq, ...safe } = partiya.toObject()
    res.json(safe)
  } catch (err) { next(err) }
}

exports.getAll = async (req, res, next) => {
  try {
    const filter = {}
    if (req.user.role === 'teplitsa') filter.teplitsa = req.user.id
    if (req.user.role === 'kassa')    filter.kassa    = req.user.id
    if (req.query.status)             filter.status   = req.query.status

    const list = await Partiya.find(filter)
      .populate('teplitsa', 'name')
      .populate('kassa', 'name')
      .sort({ createdAt: -1 })

    if (req.user.role === 'kassa')
      return res.json(list.map(p => { const { sent, farq, received, ...s } = p.toObject(); return s }))

    if (req.user.role === 'teplitsa')
      return res.json(list.map(p => {
        const { farq, received, ...s } = p.toObject()
        if (s.status === 'farq_bor') s.status = 'qabul_qilindi'
        return s
      }))

    res.json(list)
  } catch (err) { next(err) }
}

exports.getOne = async (req, res, next) => {
  try {
    const partiya = await Partiya.findById(req.params.id).populate('teplitsa','name').populate('kassa','name')
    if (!partiya) return res.status(404).json({ message: 'Topilmadi' })
    if (req.user.role === 'kassa'    && partiya.kassa._id.toString()    !== req.user.id) return res.status(403).json({ message: "Ruxsat yo'q" })
    if (req.user.role === 'teplitsa' && partiya.teplitsa._id.toString() !== req.user.id) return res.status(403).json({ message: "Ruxsat yo'q" })
    if (req.user.role === 'kassa')    { const { sent, farq, received, ...s } = partiya.toObject(); return res.json(s) }
    if (req.user.role === 'teplitsa') { const { farq, received, ...s } = partiya.toObject(); if (s.status === 'farq_bor') s.status = 'qabul_qilindi'; return res.json(s) }
    res.json(partiya)
  } catch (err) { next(err) }
}
