import { useState, useEffect, useRef } from 'react'
import { CalendarDays, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { todayLocal, formatSanaUz, UZ_MONTHS, MIN_SANA } from '../lib/date'

// Sana bo'yicha qidiruv.
//
// Ilgari bu yerda ikkita <input type="date"> bor edi. Telefonda bu juda noqulay
// chiqdi: har bir maydon operatsion tizimning alohida kalendarini ochardi,
// oraliq tanlash uchun 6 ta harakat kerak bo'lardi, sana esa 18.07.2026 ko'rinishida
// chiqib, ilovaning qolgan qismidagi "18-iyul" bilan mos kelmasdi.
// "Faqat shu kun" degan tugma ham faqat shu noqulaylikni yamash uchun turardi.
//
// Endi bitta kalendar: birinchi bosish — boshlanish, ikkinchisi — tugash.
// Bitta kun kerak bo'lsa — bir xil kunni ikki marta bosiladi, alohida tugma shart emas.
// Yozuv bo'lgan kunlar tagida nuqta turadi — kassa qaysi kunlarda savdo bo'lganini
// darrov ko'radi (buning uchun sahifadan `kunlar` proplari uzatiladi).

const HAFTA = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

const kalit = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// Oy katakchalari, dushanbadan boshlab. Bo'sh kataklar — null.
function oyKataklari(yil, oy) {
  const bosh   = (new Date(yil, oy, 1).getDay() + 6) % 7
  const kunlar = new Date(yil, oy + 1, 0).getDate()
  const katak  = Array(bosh).fill(null)
  for (let d = 1; d <= kunlar; d++) katak.push(d)
  return katak
}

const bugun    = () => todayLocal()
const kunOldin = n => { const d = new Date(); d.setDate(d.getDate() - n); return todayLocal(d) }
const oyBoshi  = () => { const d = new Date(); return todayLocal(new Date(d.getFullYear(), d.getMonth(), 1)) }

const PRESETS = [
  { key: 'hammasi', label: 'Hammasi', range: () => ({ from: '', to: '' }) },
  { key: 'bugun',   label: 'Bugun',   range: () => ({ from: bugun(), to: bugun() }) },
  { key: 'hafta',   label: '7 kun',   range: () => ({ from: kunOldin(6), to: bugun() }) },
  { key: 'oy',      label: 'Shu oy',  range: () => ({ from: oyBoshi(), to: bugun() }) },
]

export function useSanaFilter() {
  const [preset, setPreset] = useState('hammasi')
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')

  const tanla = key => {
    const p = PRESETS.find(x => x.key === key)
    if (!p) return
    const r = p.range()
    setPreset(key); setFrom(r.from); setTo(r.to)
  }
  const oraliqQoy = (a, b) => { setFrom(a); setTo(b); setPreset('aniq') }

  const active = !!(from || to)

  // dateOf — sana yozuvning qayeridan olinishi (masalan qarzda paidAt)
  const filter = (items, dateOf = it => it.createdAt) => {
    if (!active) return items
    const min = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity
    const max = to   ? new Date(`${to}T23:59:59.999`).getTime() : Infinity
    return items.filter(it => {
      const t = new Date(dateOf(it)).getTime()
      return t >= min && t <= max
    })
  }

  const label = !active ? 'Hammasi'
    : from && to && from === to ? formatSanaUz(from)
    : from && to                ? `${formatSanaUz(from)} — ${formatSanaUz(to)}`
    : from                      ? `${formatSanaUz(from)} dan`
    : `${formatSanaUz(to)} gacha`

  return { preset, from, to, active, label, filter, tanla, oraliqQoy,
           tozala: () => tanla('hammasi') }
}

// ── Kalendar ────────────────────────────────────────────────────────
function Kalendar({ f, kunlar, onYopish }) {
  const bugungi = todayLocal()
  const boshlash = f.from ? new Date(`${f.from}T00:00:00`) : new Date()
  const [kor, setKor]     = useState({ yil: boshlash.getFullYear(), oy: boshlash.getMonth() })
  // 'bosh' — keyingi bosish boshlanish sanasi, 'oxir' — tugash sanasi
  const [rejim, setRejim] = useState('bosh')

  const kataklar = oyKataklari(kor.yil, kor.oy)
  const surish = n => {
    const d = new Date(kor.yil, kor.oy + n, 1)
    setKor({ yil: d.getFullYear(), oy: d.getMonth() })
  }
  // Kelajakdagi oyga va MIN_SANA dan oldingi oyga o'tish yopiq
  const keyingiBor = kalit(kor.yil, kor.oy, 1) < bugungi.slice(0, 7) + '-01'
  const oldingiBor = kalit(kor.yil, kor.oy, 1) > MIN_SANA

  const bosildi = s => {
    if (rejim === 'bosh')      { f.oraliqQoy(s, s); setRejim('oxir') }
    else if (s >= f.from)      { f.oraliqQoy(f.from, s); setRejim('bosh') }
    else                       { f.oraliqQoy(s, f.to); setRejim('bosh') }
  }

  return (
    <div>
      {/* Oy boshqaruvi */}
      <div className="flex items-center gap-1 mb-1">
        <button
          onClick={() => surish(-1)}
          disabled={!oldingiBor}
          aria-label="Oldingi oy"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors disabled:opacity-25"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="flex-1 text-center text-sm font-bold text-ctext">
          {UZ_MONTHS[kor.oy].replace(/^./, c => c.toUpperCase())} {kor.yil}
        </p>
        <button
          onClick={() => surish(1)}
          disabled={!keyingiBor}
          aria-label="Keyingi oy"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors disabled:opacity-25"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onYopish}
          aria-label="Yopish"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nima qilish kerakligi — o'ylab o'tirmaslik uchun */}
      <p className="text-[11px] font-semibold text-primary text-center mb-1.5">
        {rejim === 'bosh' ? 'Boshlanish kunini tanlang' : 'Tugash kunini tanlang'}
      </p>

      <div className="grid grid-cols-7 mb-0.5">
        {HAFTA.map(h => (
          <span key={h} className="text-center text-[11px] font-semibold text-text-sub py-1">{h}</span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {kataklar.map((d, i) => {
          if (!d) return <span key={i} />
          const s        = kalit(kor.yil, kor.oy, d)
          const yopiq    = s > bugungi || s < MIN_SANA
          const ichida   = f.from && f.to && s >= f.from && s <= f.to
          const chekka   = s === f.from || s === f.to
          const yozuvBor = kunlar?.has(s)

          return (
            <button
              key={i}
              onClick={() => bosildi(s)}
              disabled={yopiq}
              className={`relative h-11 text-sm font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed
                ${ichida && !chekka ? 'bg-blue-bg text-ctext' : ''}
                ${chekka ? 'bg-primary text-white font-bold rounded-xl' : ''}
                ${!ichida && !chekka ? 'text-ctext hover:bg-cbg rounded-xl' : ''}
                ${s === bugungi && !chekka ? 'ring-1 ring-inset ring-primary/40 rounded-xl' : ''}`}
            >
              {d}
              {yozuvBor && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  chekka ? 'bg-white/70' : 'bg-cgreen'
                }`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SanaFilter({ f, count, kunlar, className = '' }) {
  const [open, setOpen] = useState(false)
  const aniq = f.preset === 'aniq'
  const wrapRef = useRef(null)

  // Paneldan chiqishning uchta yo'li: tashqariga bosish, Escape va "Tayyor"
  useEffect(() => {
    if (!open) return
    const tashqariga = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const tugma = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', tashqariga)
    document.addEventListener('keydown', tugma)
    return () => {
      document.removeEventListener('mousedown', tashqariga)
      document.removeEventListener('keydown', tugma)
    }
  }, [open])

  return (
    <div className={className} ref={wrapRef}>
      {/* flex-wrap: tor ekranda oxirgi tugma chetdan chiqib ketmasligi uchun.
          Balandlik 44px — barmoq uchun eng kam o'lcham */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => { f.tanla(p.key); setOpen(false) }}
            className={`h-11 px-4 rounded-xl text-sm font-semibold border whitespace-nowrap transition-colors ${
              f.preset === p.key
                ? 'bg-primary text-white border-primary'
                : 'bg-ccard text-text-sub border-cborder hover:border-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(o => !o)}
          className={`h-11 px-4 rounded-xl text-sm font-semibold border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            aniq || open
              ? 'bg-primary text-white border-primary'
              : 'bg-ccard text-text-sub border-cborder hover:border-primary'
          }`}
        >
          <CalendarDays size={15} /> Sana tanlash
        </button>
      </div>

      {open && (
        <div className="mt-2 bg-ccard border border-cborder rounded-2xl p-3">
          <Kalendar f={f} kunlar={kunlar} onYopish={() => setOpen(false)} />

          <div className="flex items-center gap-2 mt-2 pt-2.5 border-t border-separator">
            <p className="flex-1 min-w-0 text-sm font-semibold text-ctext truncate">
              {f.active ? f.label : 'Kun tanlanmagan'}
            </p>
            {f.active && (
              <button
                onClick={f.tozala}
                className="h-11 px-3 rounded-xl text-sm font-semibold text-cred hover:bg-red-bg transition-colors"
              >
                Tozalash
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Check size={16} /> Tayyor
            </button>
          </div>
        </div>
      )}

      {f.active && !open && (
        <div className="flex items-center gap-2 mt-2 px-1">
          <p className="text-sm text-text-sub flex-1 min-w-0 truncate">
            <span className="font-semibold text-ctext">{f.label}</span>
            {count != null && ` · ${count} ta yozuv`}
          </p>
          <button onClick={f.tozala} className="text-sm font-semibold text-primary hover:underline shrink-0 h-11 px-2">
            Tozalash
          </button>
        </div>
      )}
    </div>
  )
}
