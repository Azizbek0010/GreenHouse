import { Banknote, CreditCard } from 'lucide-react'

// To'lov usuli — naqt / karta / aralash.
//
// Ikki rejim bor:
//   aralash: false — bitta usul. Segment-tanlagich (avvalgi ko'rinish).
//   aralash: true  — summa ikkiga bo'linadi. Segment YASHIRILADI (buyurtmachi
//                    shunday so'radi), o'rniga ikkita summa maydoni chiqadi.
//
// Qoldiq (jami − naqt − karta) shu yerda faqat KO'RSATILADI. U bilan nima
// qilishni ota-komponent hal qiladi: sotuv formasida qoldiq qarzga yoziladi
// (ism/telefon so'raladi), qarzni to'lash modalida — qarzda qolaveradi.
const USULLAR = [
  { key: 'naqt',  label: 'Naqt',  icon: Banknote,   color: 'text-cgreen' },
  { key: 'karta', label: 'Karta', icon: CreditCard, color: 'text-primary' },
]

const money   = n => (n || 0).toLocaleString('ru-RU')
const num     = s => parseInt(String(s ?? '').replace(/\D/g, '')) || 0
const fmtNum  = n => (n ? money(n) : '')

// value: { aralash, usul, naqt, karta }
export const bushTolov = (usul = 'naqt') => ({ aralash: false, usul, naqt: 0, karta: 0 })

// Qoldiq: aralash bo'lmasa qoldiq yo'q (hammasi bitta usulda to'langan)
export function tolovQoldiq(jami, t) {
  return t.aralash ? jami - t.naqt - t.karta : 0
}

// Yozuvda qaysi usuldan QANCHA pul kelgani. Tarix filtrlari shu yerdan
// hisoblaydi: aralash sotuv "Karta" filtriga faqat karta qismi bilan kiradi,
// butun summasi bilan emas — aks holda naqt va karta jamlari qo'shilganda
// haqiqiy savdodan katta chiqardi.
//
// Qarz mi yoki sotuv mi — payments massivi bo'yicha ajratiladi (Qarz da
// har doim bor, Sotuv da yo'q), _kind kabi tashqi belgiga bog'lanmaydi.
export function usulSummalar(yozuv) {
  if (Array.isArray(yozuv?.payments)) {
    const r = { naqt: 0, karta: 0 }
    for (const p of yozuv.payments) if (p.usul === 'naqt' || p.usul === 'karta') r[p.usul] += p.amount
    return r
  }
  // Yangi sotuv yozuvlarida summalar bor
  if (yozuv?.naqtSumma != null || yozuv?.kartaSumma != null)
    return { naqt: yozuv.naqtSumma || 0, karta: yozuv.kartaSumma || 0 }
  // Eski yozuv — summa yo'q, faqat usul ma'lum
  return {
    naqt:  yozuv?.tolov === 'naqt'  ? (yozuv.totalPrice || 0) : 0,
    karta: yozuv?.tolov === 'karta' ? (yozuv.totalPrice || 0) : 0,
  }
}

// Yozuv qaysi usullarga tegishli — filtrda ko'rinishi uchun
export function yozuvUsullari(yozuv) {
  const s = usulSummalar(yozuv)
  return [...(s.naqt > 0 ? ['naqt'] : []), ...(s.karta > 0 ? ['karta'] : [])]
}

// Backend ga yuboriladigan maydonlar
export function tolovPayload(jami, t) {
  return t.aralash
    ? { naqtSumma: t.naqt, kartaSumma: t.karta }
    : { tolov: t.usul }
}

// Formani saqlashdan oldin tekshirish. Xato bo'lsa matn, aks holda null.
export function tolovXato(jami, t, { qarzRuxsat = false } = {}) {
  if (!t.aralash) return null
  if (t.naqt <= 0 && t.karta <= 0) return "To'lov summasini kiriting"
  const qoldiq = tolovQoldiq(jami, t)
  if (qoldiq < 0) return "To'lov summasi jamidan oshib ketdi"
  if (qoldiq > 0 && !qarzRuxsat)
    return "Naqt va karta summasi jamiga teng bo'lishi kerak"
  return null
}

// ── Bitta summa kartasi ────────────────────────────────────────────
function SummaCard({ usul, value, onChange }) {
  const Icon   = usul.icon
  const bor    = value > 0
  const naqtmi = usul.key === 'naqt'
  // label — butun karta bosiladigan maydon bo'lsin. Input o'zi atigi 112x28px,
  // telefonda bunga tushish qiyin; endi 343x66px karta ham fokus beradi.
  return (
    <label
      className={`flex items-center gap-3 px-3.5 py-3 mb-2 bg-ccard border border-cborder rounded-2xl border-l-4 transition-colors cursor-text ${
        bor ? (naqtmi ? 'border-l-cgreen' : 'border-l-primary') : 'border-l-cborder'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          bor ? (naqtmi ? 'bg-green-bg text-cgreen' : 'bg-blue-bg text-primary') : 'bg-cbg text-text-sub'
        }`}
      >
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ctext leading-tight">{usul.label}</p>
        <p className="text-[11px] text-text-sub leading-tight mt-0.5">
          {naqtmi ? "qo'lga tegdi" : 'terminal orqali'}
        </p>
      </div>
      <div className="ml-auto flex items-baseline gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={fmtNum(value)}
          onChange={e => onChange(num(e.target.value))}
          placeholder="0"
          aria-label={`${usul.label} summasi`}
          className="w-28 text-right bg-transparent text-ctext text-lg font-bold outline-none placeholder:text-text-sub/50"
        />
        <span className="text-xs text-text-sub font-semibold shrink-0">so'm</span>
      </div>
    </label>
  )
}

export default function TolovField({
  jami = 0,
  value,
  onChange,
  label = "To'lov usuli",
  qarzRuxsat = false,      // qoldiqni qarzga qoldirish mumkinmi
  qoldiqMatn = 'Qarzga qoladi',
  rejimLabel = "Aralash to'lov",
  rejimHint,
  segmentKorinsin = true,  // rejim o'chirilganda naqt/karta segmenti chiqadimi
  className = '',
}) {
  const t      = value
  const set    = patch => onChange({ ...t, ...patch })
  const qoldiq = tolovQoldiq(jami, t)

  return (
    <div className={className}>
      {/* Bo'lim sarlavhasi — rejimdan QAT'IY NAZAR ko'rinadi. Ilgari u faqat
          segment bilan birga chiqardi: aralash yoqilganda to'lov bloki
          formadagi yagona sarlavhasiz bo'lim bo'lib qolardi va tugma
          yuqoridagi kartaga "yopishib" ketardi. */}
      {label && segmentKorinsin && (
        <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">{label}</p>
      )}

      {/* Rejim tugmasi. py-1.5 — bosish maydoni 34px edi, telefon uchun kam
          (kerak 44px); endi 46px. */}
      <button
        type="button"
        onClick={() => set({ aralash: !t.aralash })}
        aria-pressed={t.aralash}
        className="flex items-center gap-2.5 w-full text-left py-1.5 mb-2"
      >
        <span
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
            t.aralash ? 'bg-primary' : 'bg-cborder'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              t.aralash ? 'translate-x-5' : ''
            }`}
          />
        </span>
        <span>
          <span className="block text-sm font-bold text-ctext leading-tight">{rejimLabel}</span>
          <span className="block text-[11.5px] text-text-sub leading-tight mt-0.5">
            {rejimHint ?? (qarzRuxsat
              ? "Karta va naqd birga · qoldiq qarzga yoziladi"
              : 'Karta va naqd birga')}
          </span>
        </span>
      </button>

      {/* Rejim o'chirilgan — segment. Yoqilganda bu tugmalar ko'rinmaydi. */}
      {!t.aralash && segmentKorinsin && (
        <>
          <div className="flex gap-1 p-1 bg-cbg border border-cborder rounded-xl">
            {USULLAR.map(u => {
              const Icon = u.icon
              const active = t.usul === u.key
              return (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => set({ usul: u.key })}
                  className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    active ? `bg-ccard shadow-sm ${u.color}` : 'text-text-sub hover:text-ctext'
                  }`}
                >
                  <Icon size={15} />
                  {u.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Rejim yoqilgan — ikkita summa maydoni + qoldiq */}
      {t.aralash && (
        <>
          <SummaCard usul={USULLAR[0]} value={t.naqt}  onChange={v => set({ naqt: v })} />
          <SummaCard usul={USULLAR[1]} value={t.karta} onChange={v => set({ karta: v })} />

          <div
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold ${
              qoldiq < 0
                ? 'bg-red-bg text-cred'
                : qoldiq === 0
                  ? 'bg-green-bg text-cgreen'
                  : 'bg-orange-bg text-corange'
            }`}
          >
            <span>
              {qoldiq < 0 ? "Ortiqcha to'lov" : qoldiq === 0 ? "To'liq to'landi" : qoldiqMatn}
            </span>
            <span className="tabular">{money(Math.abs(qoldiq))} so'm</span>
          </div>
        </>
      )}
    </div>
  )
}

// Ro'yxatlarda ko'rsatiladigan kichik belgi. null = eski yozuv, hech narsa chiqmaydi.
export function TolovBadge({ value }) {
  if (value !== 'naqt' && value !== 'karta') return null
  const naqt = value === 'naqt'
  const Icon = naqt ? Banknote : CreditCard
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        naqt ? 'bg-green-bg text-cgreen' : 'bg-blue-bg text-primary'
      }`}
    >
      <Icon size={11} />
      {naqt ? 'Naqt' : 'Karta'}
    </span>
  )
}

// Aralash sotuv uchun: ikkita belgi, har birida o'z summasi.
// Faqat "Aralash" deb yozish yetmaydi — kassir qaysi usuldan qancha
// kelganini ro'yxatdan ko'rishi kerak.
export function TolovBadges({ yozuv }) {
  const { tolov, naqtSumma, kartaSumma } = yozuv || {}
  if (tolov !== 'aralash') return <TolovBadge value={tolov} />
  return (
    <>
      {naqtSumma > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-bg text-cgreen">
          <Banknote size={11} />
          {money(naqtSumma)}
        </span>
      )}
      {kartaSumma > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-bg text-primary">
          <CreditCard size={11} />
          {money(kartaSumma)}
        </span>
      )}
    </>
  )
}
