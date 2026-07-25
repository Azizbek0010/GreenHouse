// Telefon raqami — ikki joyda kerak: "Qarzga sotish" formasi va oddiy sotuvda
// qoldiq qarzga ketganda. Ikki xil tekshiruv bo'lmasligi uchun bitta joyda.

// +998 dan keyingi 9 raqam. Kiritilgandan 998/+ ni tozalaydi, 9 taga cheklaydi.
export function phoneDigits(raw) {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('998')) d = d.slice(3)
  return d.slice(0, 9)
}

// 9 raqamni "XX XXX XX XX" ko'rinishida chiqaradi
export function formatUzPhone(d) {
  const s = String(d ?? '')
  const p = []
  if (s.length > 0) p.push(s.slice(0, 2))
  if (s.length > 2) p.push(s.slice(2, 5))
  if (s.length > 5) p.push(s.slice(5, 7))
  if (s.length > 7) p.push(s.slice(7, 9))
  return p.join(' ')
}

export const PHONE_XATO = "Telefon raqami to'liq emas: +998 dan keyin 9 ta raqam"
export const phoneToliq = d => String(d ?? '').length === 9
