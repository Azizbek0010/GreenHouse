require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

const USERS = [
  { name: 'Admin',   phone: '+998901234567', password: 'admin123',    role: 'admin' },
  { name: 'Sardor',  phone: '+998901234568', password: 'teplitsa123', role: 'teplitsa' },
  { name: 'Akbar',   phone: '+998901234569', password: 'kassa123',    role: 'kassa' },
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB ga ulandi')
  await User.deleteMany({})
  console.log('Eski foydalanuvchilar tozalandi')
  for (const u of USERS) {
    await User.create(u)
    console.log(`OK ${u.role}: ${u.name} (${u.phone}) — parol: ${u.password}`)
  }
  await mongoose.disconnect()
  console.log('Hammasi tayyor!')
}

seed().catch(e => { console.error(e); process.exit(1) })
