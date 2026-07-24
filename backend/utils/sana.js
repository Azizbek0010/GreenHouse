// Formalardagi ixtiyoriy "sana" maydonini qayta ishlash.
// Sana tanlanmasa — yozuv hozirgi vaqt bilan yoziladi (avvalgi xatti-harakat).
// Sana tanlansa — yozuv o'sha kunga tushadi: createdAt shu sanaga o'rnatiladi,
// shuning uchun statistika, tarix, grafik va ombor hech qanday o'zgarishsiz ishlayveradi.

const MIN_SANA  = '2026-01-01'   // bundan oldingi sana deyarli har doim xato (masalan 2016)
const TZ_OFFSET = 5              // Asia/Tashkent = UTC+5

// Toshkent bo'yicha bugungi kun, 'YYYY-MM-DD'
function todayTashkent() {
  const shifted = new Date(Date.now() + TZ_OFFSET * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

// 'YYYY-MM-DD' -> { error } yoki { createdAt, backfill }
// createdAt undefined bo'lsa — Mongoose o'zi hozirgi vaqtni qo'yadi.
function resolveSana(sana) {
  if (sana == null || sana === '') return { createdAt: undefined, backfill: false }

  if (typeof sana !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sana))
    return { error: "Sana formati noto'g'ri (YYYY-MM-DD kutilmoqda)" }

  // O'sha kunning Toshkent bo'yicha soat 12:00 i (= 07:00 UTC).
  // Peshin bejiz emas: backend UTC da hisoblaydi, brauzer esa Toshkent vaqtida
  // kunlarga bo'ladi — peshin ikkalasida ham bir xil kunga tushadi,
  // yarim tun esa kunni bir kun orqaga surib yuborardi.
  const createdAt = new Date(`${sana}T07:00:00.000Z`)
  if (isNaN(createdAt.getTime()) || createdAt.toISOString().slice(0, 10) !== sana)
    return { error: "Bunday sana yo'q" }

  const today = todayTashkent()
  if (sana > today)    return { error: "Kelajakdagi sanani tanlab bo'lmaydi" }
  if (sana < MIN_SANA) return { error: `Sana ${MIN_SANA} dan oldin bo'lishi mumkin emas` }

  // Bugun tanlangan bo'lsa — haqiqiy hozirgi vaqt.
  // Aks holda ertalab kiritilgan yozuv peshinga, ya'ni kelajakka tushib qolardi.
  if (sana === today) return { createdAt: undefined, backfill: false }

  return { createdAt, backfill: true }
}

// Model.create(...) ga qo'shiladigan maydonlar.
// enteredAt — yozuv aslida qachon kiritilgani (audit): sana qo'lda qo'yilganda
// createdAt endi "kiritilgan payt" degani emas.
function sanaFields(s) {
  if (!s.createdAt) return {}
  return { createdAt: s.createdAt, backfill: true, enteredAt: new Date() }
}

// adminUpdate uchun: yozuvning sanasini (createdAt) tuzatish.
// resolveSanaForEdit — sana kelmasa {skip}, xato bo'lsa {error}, aks holda {createdAt, backfill}.
function resolveSanaForEdit(sana) {
  if (sana === undefined || sana === '') return { skip: true }
  const s = resolveSana(sana)
  if (s.error) return { error: s.error }
  // Bugun tanlansa createdAt = hozir; o'tgan kun — peshin (resolveSana bergan)
  return { createdAt: s.createdAt || new Date(), backfill: !!s.createdAt }
}

// createdAt Mongoose da immutable (timestamps: true) — na doc.save(), na doc.createdAt=...
// ishlamaydi (ikkovi ham jimgina e'tiborsiz qoldiriladi). Shuning uchun:
//   1) bazada to'g'ridan-to'g'ri drayver orqali yangilaymiz (immutable ni chetlab o'tadi)
//   2) javob uchun doc._doc ga yozamiz — bu ham immutable setterni chetlab o'tadi
async function forceCreatedAt(Model, doc, r) {
  await Model.collection.updateOne(
    { _id: doc._id },
    { $set: { createdAt: r.createdAt, backfill: r.backfill } }
  )
  doc._doc.createdAt = r.createdAt
  doc._doc.backfill  = r.backfill
}

module.exports = { resolveSana, sanaFields, todayTashkent, MIN_SANA, resolveSanaForEdit, forceCreatedAt }
