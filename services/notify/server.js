const express  = require('express')
const http     = require('http')
const { Server } = require('socket.io')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(express.json())

// Boshqa servislar shu endpoint'ga POST qilib socketga xabar yuboradi
app.post('/emit', (req, res) => {
  const { room, event, data } = req.body
  if (!room || !event) return res.status(400).json({ error: 'room va event kerak' })
  io.to(room).emit(event, data)
  res.json({ ok: true })
})

app.get('/health', (_, res) => res.json({ ok: true }))

io.on('connection', (socket) => {
  socket.on('join', ({ userId, role }) => {
    if (userId) socket.join(`user_${userId}`)
    if (role === 'admin') socket.join('admin')
  })
  socket.on('disconnect', () => {})
})

server.listen(3006, () => console.log('notify-service :3006'))
