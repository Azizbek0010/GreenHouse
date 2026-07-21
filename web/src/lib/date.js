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
