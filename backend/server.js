  require('dotenv').config()
const express   = require('express')
const http      = require('http')
const { Server } = require('socket.io')
const mongoose  = require('mongoose')
const cors      = require('cors')
const path      = require('path')

const authRoutes    = require('./routes/auth.routes')
const partiyaRoutes = require('./routes/partiya.routes')
const sotuvRoutes   = require('./routes/sotuv.routes')
const atxodRoutes   = require('./routes/atxod.routes')
const statsRoutes   = require('./routes/stats.routes')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

// io ni controllerlarda ishlatish uchun
app.set('io', io)

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth',    authRoutes)
app.use('/api/partiya', partiyaRoutes)
app.use('/api/sotuv',   sotuvRoutes)
app.use('/api/atxod',   atxodRoutes)
app.use('/api/stats',   statsRoutes)

app.use((err, req, res, next) => {
  console.error(err.message)
  // Mongoose validatsiya / noto'g'ri ID — bu client xatosi, 500 emas
  if (err.name === 'ValidationError' || err.name === 'CastError')
    return res.status(400).json({ message: err.message })
  // Multer xatolari (masalan rasm 10MB dan katta)
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Rasm 10MB dan katta bo\'lmasligi kerak' : err.message
    return res.status(400).json({ message: msg })
  }
  res.status(err.status || 500).json({ message: err.message || 'Server error' })
})

// Socket.io — foydalanuvchi ulanganida o'z xonasiga qo'shiladi
io.on('connection', (socket) => {
  // Client: socket.emit('join', { userId, role })
  socket.on('join', ({ userId, role }) => {
    socket.join(`user_${userId}`)   // faqat o'ziga
    if (role === 'admin') socket.join('admin')
    console.log(`Socket ulandi: ${role} (${userId})`)
  })

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
