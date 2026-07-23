// Sana yordamchilari — formalardagi ixtiyoriy "Sana" maydoni uchun.

// Backend bilan bir xil chegara (backend/utils/sana.js)
export const MIN_SANA = '2026-01-01'

const pad = n => String(n).padStart(2, '0')

// Brauzer mahalliy vaqti bo'yicha bugungi kun, 'YYYY-MM-DD'.
// toISOString() ataylab ishlatilmagan: u UTC beradi, Toshkent esa UTC+5 —
// tunda (00:00–05:00) u bugungi kunni kechagi qilib ko'rsatib, <input max> ni
// noto'g'ri cheklab qo'yardi.
export function todayLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
]

// '2026-01-15' -> '15-yanvar' (boshqa yil bo'lsa yil ham qo'shiladi).
// Brauzerning o'z formati (dd.mm.yyyy / дд.мм.гггг) foydalanuvchi tiliga
// bog'liq va o'zbekcha interfeysda begona ko'rinadi — shuning uchun o'zimiz yozamiz.
export function formatSanaUz(sana) {
  if (!sana) return ''
  const [y, m, d] = sana.split('-').map(Number)
  if (!y || !m || !d) return sana
  const label = `${d}-${UZ_MONTHS[m - 1]}`
  return y === new Date().getFullYear() ? label : `${label}, ${y}`
}

// Bir kunni ajratuvchi kalit — guruhlash uchun.
export function dateKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
}

// Ro'yxatlardagi kun sarlavhasi: har doim aniq sana ('22-iyul').
// "Bugun"/"Kecha" ataylab ishlatilmaydi — buyurtmachi aniq sanani so'radi:
// ro'yxatni ochganda qaysi kun ekani darrov ko'rinishi kerak.
export function sanaLabel(d) {
  const dt = new Date(d)
  const label = `${dt.getDate()}-${UZ_MONTHS[dt.getMonth()]}`
  return dt.getFullYear() === new Date().getFullYear() ? label : `${label}, ${dt.getFullYear()}`
}

// '22-iyul, 14:30'
export function sanaSoat(d) {
  return `${sanaLabel(d)}, ${soat(d)}`
}

export function soat(d) {
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Yozuvlarni kun bo'yicha guruhlaydi. dateOf — sanani qayerdan olish kerakligi.
export function groupByDate(items, dateOf = it => it.createdAt) {
  const groups = []
  const seen = {}
  for (const item of items) {
    const key = dateKey(dateOf(item))
    if (!seen[key]) {
      seen[key] = { key, label: sanaLabel(dateOf(item)), date: dateOf(item), items: [] }
      groups.push(seen[key])
    }
    seen[key].items.push(item)
  }
  return groups
}
