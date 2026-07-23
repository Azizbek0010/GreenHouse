import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
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
  // Qo'lda kiritilsa — hech qaysi tez tugma yonmaydi
  const qoldaFrom = v => { setFrom(v); setPreset('aniq') }
  const qoldaTo   = v => { setTo(v);   setPreset('aniq') }
  const birKun    = () => { if (from) { setTo(from); setPreset('aniq') } }

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

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
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
        </button>
      </div>

      {open && (
        <div className="mt-2 bg-ccard border border-cborder rounded-xl p-3">
          <div className="flex gap-2">
            <label className="flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">Dan</span>
              <input
                type="date"
                value={f.from}
                min={MIN_SANA}
                max={f.to || todayLocal()}
                onChange={e => f.qoldaFrom(e.target.value)}
                className="w-full h-10 px-2.5 rounded-xl border border-cborder bg-cbg text-sm text-ctext outline-none focus:border-primary"
              />
            </label>
            <label className="flex-1 min-w-0">
              <span className="block text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">Gacha</span>
              <input
                type="date"
                value={f.to}
                min={f.from || MIN_SANA}
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
              <button
                onClick={() => { f.tozala(); setOpen(false) }}
                className="h-9 px-3 rounded-xl border border-cborder bg-cbg text-xs font-semibold text-cred hover:border-cred transition-colors flex items-center gap-1.5"
              >
                <X size={13} /> Tozalash
              </button>
            )}
          </div>
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
