require('dotenv').config()

// Muhit o'zgaruvchilarini tekshirish (server ishlamasidan oldin)
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI']
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} env o'zgaruvchisi o'rnatilmagan`)
    process.exit(1)
  }
}

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const mongoose   = require('mongoose')
const cors       = require('cors')
const helmet     = require('helmet')
const jwt        = require('jsonwebtoken')

const authRoutes    = require('./routes/auth.routes')
const partiyaRoutes = require('./routes/partiya.routes')
const sotuvRoutes   = require('./routes/sotuv.routes')
const qarzRoutes    = require('./routes/qarz.routes')
const atxodRoutes   = require('./routes/atxod.routes')
const statsRoutes   = require('./routes/stats.routes')
const flowerTypeRoutes = require('./routes/flowerType.routes')
const stockRoutes   = require('./routes/stock.routes')

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:8081', 'exp://localhost:8081']
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? [...DEFAULT_ORIGINS, ...process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)]
  : DEFAULT_ORIGINS

// CORS: ro'yxatdagi domenlar + har qanday *.vercel.app (prod + preview deploylar).
// origin bo'lmasa (mobil app, curl, server-to-server) — ruxsat.
function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true)
  try {
    const host = new URL(origin).hostname
    if (ALLOWED_ORIGINS.includes(origin) || host === 'vercel.app' || host.endsWith('.vercel.app'))
      return cb(null, true)
  } catch { /* noto'g'ri origin */ }
  cb(new Error('CORS: ruxsat etilmagan origin'))
}

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: corsOrigin } })

// Socket.io — JWT orqali autentifikatsiya
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Unauthorized'))
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    next()
  } catch {
    next(new Error('Token yaroqsiz'))
  }
})

// io ni controllerlarda ishlatish uchun
app.set('io', io)

app.use(helmet())
app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '1mb' }))

app.use('/api/auth',    authRoutes)
app.use('/api/partiya', partiyaRoutes)
app.use('/api/sotuv',   sotuvRoutes)
app.use('/api/qarz',    qarzRoutes)
app.use('/api/atxod',   atxodRoutes)
app.use('/api/stats',   statsRoutes)
app.use('/api/flower-types', flowerTypeRoutes)
app.use('/api/stock',   stockRoutes)

app.use((req, res) => res.status(404).json({ message: 'Route topilmadi' }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  if (err.name === 'ValidationError')
    return res.status(400).json({ message: "Ma'lumotlar noto'g'ri" })
  if (err.name === 'CastError')
    return res.status(400).json({ message: 'ID formati noto\'g\'ri' })
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Rasm 10MB dan katta bo\'lmasligi kerak' : 'Fayl yuklashda xato'
    return res.status(400).json({ message: msg })
  }
  res.status(err.status || 500).json({ message: 'Server xatosi' })
})

// Socket.io — foydalanuvchi ulanganida o'z xonasiga qo'shiladi (JWT dan role/id olinadi)
io.on('connection', (socket) => {
  const { id: userId, role } = socket.user
  socket.join(`user_${userId}`)
  if (role === 'admin') socket.join('admin')
  console.log(`Socket ulandi: ${role}`)

  socket.on('disconnect', () => {
    console.log('Socket uzildi:', socket.id)
  })
})

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB ulandi')
    server.listen(process.env.PORT || 5000, () =>
      console.log(`Server ishlamoqda: http://localhost:${process.env.PORT || 5000}`)
    )
  })
  .catch(err => console.error('MongoDB xatosi:', err))
