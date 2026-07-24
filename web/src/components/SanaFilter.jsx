import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import { todayLocal, formatSanaUz } from '../lib/date'
import Kalendar from './Kalendar'

// Sana bo'yicha qidiruv.
//
// Ilgari bu yerda ikkita <input type="date"> bor edi. Telefonda bu juda noqulay
// chiqdi: har bir maydon operatsion tizimning alohida kalendarini ochardi,
// oraliq tanlash uchun 6 ta harakat kerak bo'lardi, sana esa 18.07.2026 ko'rinishida
// chiqib, ilovaning qolgan qismidagi "18-iyul" bilan mos kelmasdi.
// Endi bitta ichki `Kalendar` (mode="range"): bir bosish — boshlanish, ikkinchisi — tugash.
// Yozuv bo'lgan kunlar tagida nuqta (kunlar propi).

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
          <Kalendar mode="range" from={f.from} to={f.to}
            onRange={(a, b) => f.oraliqQoy(a, b)} kunlar={kunlar} onYopish={() => setOpen(false)} />

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
