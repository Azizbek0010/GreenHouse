// Aralash to'lov — bitta sotuv bir necha usulda to'lanadi.
// Mijoz 200 minglik gulni oldi: 100 karta, 100 naqt. Qoldiq bo'lsa — qarz.
//
// Qoidalar bitta joyda turadi, chunki uchta controller shu bilan ishlaydi:
// sotuv (to'liq to'langan), qarz (boshlang'ich to'lov), qarz/tolov (qarzni yopish).

// so'm — kasr birligi yo'q, shuning uchun butunga yaxlitib solishtiramiz:
// 0.999999 kabi float qoldiqlari "summa to'g'ri kelmadi" xatosini bermasin.
const teng = (a, b) => Math.round(a) === Math.round(b)

// Bo'sh/null = 0. Noto'g'ri son bo'lsa NaN qaytadi (chaqiruvchi tekshiradi).
function summa(v) {
  if (v == null || v === '') return 0
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return NaN
  return n
}

// Ikkala summa berilganmi (hech bo'lmasa bittasi) — aralash rejim ishlatilganmi
const berilgan = b => b.naqtSumma != null && b.naqtSumma !== '' ||
                      b.kartaSumma != null && b.kartaSumma !== ''

/**
 * To'liq to'langan sotuv uchun.
 * naqt + karta AYNAN totalPrice ga teng bo'lishi shart — ortiqcha to'lov
 * (qaytim) qabul qilinmaydi, aks holda aylanma haqiqatdan katta chiqadi.
 *
 * Eski klientlar (mobile ilova) faqat `tolov` yuboradi — summalar
 * o'zi to'ldiriladi, ya'ni API buzilmaydi.
 *
 * @returns {{ error: string } | { tolov: string|null, naqt: number|null, karta: number|null }}
 */
function tolovSotuv(body, totalPrice) {
  if (berilgan(body)) {
    const naqt  = summa(body.naqtSumma)
    const karta = summa(body.kartaSumma)
    if (Number.isNaN(naqt) || Number.isNaN(karta))
      return { error: "To'lov summasi noto'g'ri" }
    if (naqt === 0 && karta === 0)
      return { error: "To'lov summasini kiriting" }
    if (!teng(naqt + karta, totalPrice))
      return { error: `To'lov summasi jamiga teng bo'lishi kerak (${Math.round(totalPrice)})` }

    const tolov = naqt > 0 && karta > 0 ? 'aralash' : (naqt > 0 ? 'naqt' : 'karta')
    return { tolov, naqt, karta }
  }

  // Bitta usul: summani o'zimiz to'ldiramiz — statistika faqat shu maydonlarni o'qiydi
  const t = body.tolov ?? null
  if (t === null) return { tolov: null, naqt: null, karta: null }   // noma'lum (eski xatti-harakat)
  if (!['naqt', 'karta'].includes(t)) return { error: "To'lov usuli noto'g'ri" }
  return {
    tolov: t,
    naqt:  t === 'naqt'  ? totalPrice : 0,
    karta: t === 'karta' ? totalPrice : 0,
  }
}

/**
 * Qarz ochilayotganda boshlang'ich to'lov (ixtiyoriy).
 * naqt + karta totalPrice dan KICHIK bo'lishi shart: teng bo'lsa bu qarz emas,
 * oddiy sotuv — kassir noto'g'ri ekranda ishlayapti.
 *
 * @returns {{ error: string } | { naqt: number, karta: number, jami: number }}
 */
function tolovBoshlangich(body, totalPrice) {
  if (!berilgan(body)) return { naqt: 0, karta: 0, jami: 0 }

  const naqt  = summa(body.naqtSumma)
  const karta = summa(body.kartaSumma)
  if (Number.isNaN(naqt) || Number.isNaN(karta))
    return { error: "Boshlang'ich to'lov summasi noto'g'ri" }

  const jami = naqt + karta
  if (jami > totalPrice || teng(jami, totalPrice))
    return { error: "Boshlang'ich to'lov qarz summasidan kichik bo'lishi kerak — to'liq to'langan bo'lsa oddiy sotuv sifatida yozing" }

  return { naqt, karta, jami }
}

/**
 * Qarzni yopish/kamaytirish to'lovi. Bir vaqtda ikki usul bo'lishi mumkin
 * (mijoz 200 ni yopadi: 100 karta, 100 naqt) — bu payments ga IKKI yozuv
 * bo'lib tushadi, chunki har bir yozuvda bitta usul bor. Statistika
 * payments.usul bo'yicha guruhlaydi, shuning uchun bo'linish o'zi to'g'ri chiqadi.
 *
 * Eski chaqiruv shakli ({ amount, usul }) ham ishlaydi.
 *
 * @returns {{ error: string } | { qismlar: Array<{ usul: string, amount: number }>, jami: number }}
 */
function tolovQarz(body, qoldiq) {
  let qismlar

  if (berilgan(body)) {
    const naqt  = summa(body.naqtSumma)
    const karta = summa(body.kartaSumma)
    if (Number.isNaN(naqt) || Number.isNaN(karta))
      return { error: "To'lov summasi noto'g'ri" }
    qismlar = [
      ...(naqt  > 0 ? [{ usul: 'naqt',  amount: naqt  }] : []),
      ...(karta > 0 ? [{ usul: 'karta', amount: karta }] : []),
    ]
  } else {
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0)
      return { error: "To'lov summasi noto'g'ri" }
    const usul = body.usul ?? null
    if (usul !== null && !['naqt', 'karta'].includes(usul))
      return { error: "To'lov usuli noto'g'ri" }
    qismlar = [{ usul, amount }]
  }

  if (qismlar.length === 0) return { error: "To'lov summasini kiriting" }

  const jami = qismlar.reduce((s, q) => s + q.amount, 0)
  if (jami > qoldiq && !teng(jami, qoldiq))
    return { error: `To'lov qoldiqdan (${Math.round(qoldiq)}) oshib ketdi` }

  return { qismlar, jami }
}

module.exports = { tolovSotuv, tolovBoshlangich, tolovQarz, teng }
