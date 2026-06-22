// API to'liq test — fetch + FormData (RN app kabi)
const base = 'http://localhost:8080/api'

const login = async (phone, password) => {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  return r.json()
}

const log = (title, data) => console.log(`\n=== ${title} ===\n`, JSON.stringify(data, null, 2))

async function run() {
  // 1. Login uchala rol
  const admin    = await login('+998900000001', 'admin123')
  const teplitsa = await login('+998900000002', 'teplitsa123')
  const kassa    = await login('+998900000003', 'kassa123')
  console.log('✅ Login: admin, teplitsa, kassa — token olindi')

  // 2. Admin userlarni ko'radi -> kassa id
  const users = await (await fetch(`${base}/auth/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  })).json()
  const kassaId = users.find(u => u.role === 'kassa')._id
  console.log('✅ Kassa ID:', kassaId)

  // 3. Teplitsa partiya yaratadi
  const partiya = await (await fetch(`${base}/partiya`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teplitsa.token}` },
    body: JSON.stringify({
      kassaId,
      flowers: [
        { type: 'Roza', sizes: [{ sm: 80, qty: 50 }, { sm: 100, qty: 100 }] },
        { type: 'Lola', sizes: [{ sm: 60, qty: 60 }] },
      ],
    }),
  })).json()
  console.log(`✅ Partiya yaratildi: ${partiya.batchId}, status=${partiya.status}`)

  // 4. Kassa rasm bilan qabul qiladi (FARQ bilan: Roza 80sm=48, ortiqcha Xrizantema)
  const form = new FormData()
  const imgBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])
  form.append('photo', new Blob([imgBytes], { type: 'image/jpeg' }), 'test.jpg')
  form.append('flowers', JSON.stringify([
    { type: 'Roza', sizes: [{ sm: 80, qty: 48 }, { sm: 100, qty: 100 }] }, // 80sm: 48 (50 emas!)
    { type: 'Lola', sizes: [{ sm: 60, qty: 60 }] },
    { type: 'Xrizantema', sizes: [{ sm: 50, qty: 5 }] }, // teplitsa YUBORMAGAN — ortiqcha!
  ]))

  const received = await (await fetch(`${base}/partiya/${partiya._id}/receive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kassa.token}` },
    body: form,
  })).json()
  log('QABUL — kassa javobi (sent/farq YO\'Q bo\'lishi kerak)', {
    batchId: received.batchId,
    status: received.status,
    sent_yashirilganmi: received.sent === undefined ? 'HA ✅' : 'YO\'Q ❌ LEAK!',
    farq_yashirilganmi: received.farq === undefined ? 'HA ✅' : 'YO\'Q ❌ LEAK!',
  })

  // 4b. Admin partiyani ochadi — farq to'liq ko'rinishi kerak
  const adminView = await (await fetch(`${base}/partiya/${partiya._id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  })).json()
  log('ADMIN ko\'rinishi — farq', adminView.farq)

  // 5. Kassa sotuv qiladi
  const sotuvForm = new FormData()
  sotuvForm.append('flowerType', 'Roza')
  sotuvForm.append('razmer', '80')
  sotuvForm.append('qty', '10')
  sotuvForm.append('holat', 'yaxshi')
  sotuvForm.append('pricePerUnit', '6000')
  const sotuv = await (await fetch(`${base}/sotuv`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kassa.token}` },
    body: sotuvForm,
  })).json()
  log('SOTUV', { type: sotuv.flowerType, qty: sotuv.qty, total: sotuv.totalPrice })

  // 6. Kassa atxod kiritadi (rasm bilan)
  const atxodForm = new FormData()
  atxodForm.append('flowerType', 'Lola')
  atxodForm.append('razmer', '60')
  atxodForm.append('qty', '3')
  atxodForm.append('sabab', "so'lgan")
  atxodForm.append('photo', new Blob([imgBytes], { type: 'image/jpeg' }), 'atxod.jpg')
  const atxod = await (await fetch(`${base}/atxod`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kassa.token}` },
    body: atxodForm,
  })).json()
  log('ATXOD (pending)', { type: atxod.flowerType, qty: atxod.qty, sabab: atxod.sabab, status: atxod.status })

  // 7. Admin atxodni tasdiqlaydi
  const reviewed = await (await fetch(`${base}/atxod/${atxod._id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify({ status: 'approved' }),
  })).json()
  console.log(`\n✅ Admin atxodni tasdiqladi: status=${reviewed.status}`)

  // 8. Ruxsat tekshiruvi: kassa user yaratishga urinadi (403 bo'lishi kerak)
  const forbidden = await fetch(`${base}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kassa.token}` },
    body: JSON.stringify({ name: 'X', phone: '+998', password: '1', role: 'admin' }),
  })
  console.log(`\n✅ Ruxsat testi: kassa user yarata olmaydi -> HTTP ${forbidden.status} (403 kutilgan)`)

  console.log('\n🎉 Barcha testlar tugadi')
}

run().catch(e => { console.error('XATO:', e); process.exit(1) })
