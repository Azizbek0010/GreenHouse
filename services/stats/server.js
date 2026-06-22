require('dotenv').config()
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/stats', require('./routes'))

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ message: err.message || 'Server error' })
})

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(3005, () => console.log('stats-service :3005'))
}).catch(err => { console.error('MongoDB error:', err); process.exit(1) })
