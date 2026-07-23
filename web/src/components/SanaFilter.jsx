import { useState, useEffect, useRef } from 'react'
import { CalendarDays, X, Check, ChevronDown } from 'lucide-react'
import { todayLocal, formatSanaUz, MIN_SANA } from '../lib/date'

// Sana bo'yicha qidiruv — bitta filtrda ikkalasi ham:
// tez tugmalar (Bugun / 7 kun / Shu oy) oraliqni o'zi to'ldiradi,
// "Aniq sana" ochilganda Dan/Gacha ni qo'lda kiritish mumkin.
// Bitta kun kerak bo'lsa — Dan ni tanlab "Faqat shu kun" bosiladi.
//
// Filtrlash brauzerda: sahifalar ma'lumotni allaqachon to'liq yuklaydi,
// shuning uchun serverga qayta so'rov yubormaymiz — javob bir zumda.

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
  // Qo'lda kiritilsa — hech qaysi tez tugma yonmaydi.
  //
  // Maydonlar bir-birini bloklamaydi: avval Gacha ni tanlab, keyin undan
  // keyingi Dan ni qo'ysa — Gacha o'zi suriladi (aksincha ham).
  // Ilgari Gacha ning min i Dan ga bog'langan edi va noto'g'ri tartibda
  // tanlagan foydalanuvchi kalendarda o'chirilgan sanalarga tiralib qolardi.
  // Teskari tartibda tanlansa — sanalar o'rin almashadi, ya'ni ikkala
  // tanlov ham saqlanadi (birini o'chirib yuborish o'rniga).
  const qoldaFrom = v => {
    setPreset('aniq')
    if (v && to && v > to) { setFrom(to); setTo(v) }
    else setFrom(v)
  }
  const qoldaTo = v => {
    setPreset('aniq')
    if (v && from && v < from) { setTo(from); setFrom(v) }
    else setTo(v)
  }
  const birKun = () => { if (from) { setTo(from); setPreset('aniq') } }

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

  return { preset, from, to, active, label, filter, tanla, qoldaFrom, qoldaTo, birKun,
           tozala: () => tanla('hammasi') }
}

export default function SanaFilter({ f, count, className = '' }) {
  const [open, setOpen] = useState(false)
  const aniq = f.preset === 'aniq'
  const wrapRef = useRef(null)

  // Paneldan chiqishning uchta yo'li: tashqariga bosish, Escape va "Tayyor".
  // Avval faqat "Aniq sana" ni qayta bosish qolgandi — tugma esa tanlangan
  // filtr tufayli allaqachon yonib turardi, ya'ni uni yana bosish kerakligi
  // ko'rinmasdi va foydalanuvchi panelda qamalib qolardi.
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
      {/* flex-wrap, overflow-x-auto emas: tor ekranda "Aniq sana" oxirgi tugma
          bo'lgani uchun chetdan chiqib ketardi va uni topib bo'lmasdi */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => { f.tanla(p.key); setOpen(false) }}
            className={`h-8 px-3 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
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
          className={`h-8 px-3 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            aniq || open
              ? 'bg-primary text-white border-primary'
              : 'bg-ccard text-text-sub border-cborder hover:border-primary'
          }`}
        >
          <CalendarDays size={13} /> Aniq sana
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2 bg-ccard border border-cborder rounded-xl p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-text-sub uppercase tracking-wider">
              Sana oralig'i
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Yopish"
              className="w-7 h-7 -mr-1 -mt-1 rounded-lg flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">Dan</span>
              <input
                type="date"
                value={f.from}
                min={MIN_SANA}
                max={todayLocal()}
                onChange={e => f.qoldaFrom(e.target.value)}
                className="w-full h-10 px-2.5 rounded-xl border border-cborder bg-cbg text-sm text-ctext outline-none focus:border-primary"
              />
            </label>
            <label className="flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">Gacha</span>
              <input
                type="date"
                value={f.to}
                min={MIN_SANA}
                max={todayLocal()}
                onChange={e => f.qoldaTo(e.target.value)}
                className="w-full h-10 px-2.5 rounded-xl border border-cborder bg-cbg text-sm text-ctext outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="flex gap-2 mt-2.5">
            <button
              onClick={f.birKun}
              disabled={!f.from}
              className="flex-1 h-9 rounded-xl border border-cborder bg-cbg text-xs font-semibold text-ctext hover:border-primary transition-colors disabled:opacity-40"
            >
              Faqat shu kun
            </button>
            {f.active && (
              // Tozalash panelni yopmaydi — foydalanuvchi ko'pincha
              // boshqa sanani tanlash uchun tozalaydi
              <button
                onClick={f.tozala}
                className="h-9 px-3 rounded-xl border border-cborder bg-cbg text-xs font-semibold text-cred hover:border-cred transition-colors flex items-center gap-1.5"
              >
                <X size={13} /> Tozalash
              </button>
            )}
          </div>

          {/* Aniq chiqish yo'li: tanlangan sana saqlanadi, panel yopiladi */}
          <button
            onClick={() => setOpen(false)}
            className="w-full h-10 mt-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Check size={15} /> Tayyor
          </button>
        </div>
      )}

      {f.active && (
        <div className="flex items-center gap-2 mt-2 px-1">
          <p className="text-xs text-text-sub flex-1 min-w-0 truncate">
            <span className="font-semibold text-ctext">{f.label}</span>
            {count != null && ` · ${count} ta yozuv`}
          </p>
          <button onClick={f.tozala} className="text-xs font-semibold text-primary hover:underline shrink-0">
            Tozalash
          </button>
        </div>
      )}
    </div>
  )
}
