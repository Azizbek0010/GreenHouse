require('dotenv').config()
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', require('./routes'))

app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError')
    return res.status(400).json({ message: err.message })
  if (err.name === 'MulterError')
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? "Rasm 10MB dan katta bo'lmasligi kerak" : err.message })
  res.status(err.status || 500).json({ message: err.message || 'Server error' })
})

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(3001, () => console.log('auth-service :3001'))
}).catch(err => { console.error('MongoDB error:', err); process.exit(1) })
