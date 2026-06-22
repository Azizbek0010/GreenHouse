require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)

  const users = [
    { name: 'Admin',   phone: '+998900000001', password: 'admin123',   role: 'admin' },
    { name: 'Sardor',  phone: '+998900000002', password: 'teplitsa123', role: 'teplitsa' },
    { name: 'Akbar',   phone: '+998900000003', password: 'kassa123',    role: 'kassa' },
  ]

  for (const u of users) {
    const exists = await User.findOne({ phone: u.phone })
    if (exists) {
      console.log(`${u.role} (${u.phone}) allaqachon mavjud — o'tkazib yuborildi`)
      continue
    }
    await User.create(u)
    console.log(`${u.role} yaratildi: ${u.phone} / ${u.password}`)
  }

  await mongoose.disconnect()
  console.log('Seed tugadi')
}

seed().catch(err => { console.error(err); process.exit(1) })
