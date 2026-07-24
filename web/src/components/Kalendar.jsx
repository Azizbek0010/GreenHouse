import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { UZ_MONTHS, todayLocal, MIN_SANA } from '../lib/date'

// Umumiy oy kalendari. Ikki rejim:
//   mode="single" — bitta kun tanlash (formalardagi sana maydoni). value / onChange(str).
//   mode="range"  — oraliq (Tarix filtri). from, to / onRange(from, to).
// Native <input type="date"> ishlatilmaydi — buyurtmachi OT kalendarini noqulay
// dedi, shuning uchun hamma joyda shu bitta ichki kalendar.

const HAFTA = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const kalit = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function oyKataklari(yil, oy) {
  const bosh   = (new Date(yil, oy, 1).getDay() + 6) % 7   // dushanbadan
  const kunlar = new Date(yil, oy + 1, 0).getDate()
  const katak  = Array(bosh).fill(null)
  for (let d = 1; d <= kunlar; d++) katak.push(d)
  return katak
}

export default function Kalendar({
  mode = 'single',
  value = '', from = '', to = '',
  onChange, onRange, onYopish,
  kunlar, min = MIN_SANA,
}) {
  const bugungi = todayLocal()
  const boshSana = mode === 'range' ? (from || bugungi) : (value || bugungi)
  const bosh = new Date(`${boshSana}T00:00:00`)
  const [kor, setKor]     = useState({ yil: bosh.getFullYear(), oy: bosh.getMonth() })
  const [rejim, setRejim] = useState('bosh')   // range: keyingi bosish boshlanish yoki tugash

  const kataklar = oyKataklari(kor.yil, kor.oy)
  const surish = n => {
    const d = new Date(kor.yil, kor.oy + n, 1)
    setKor({ yil: d.getFullYear(), oy: d.getMonth() })
  }
  const keyingiBor = kalit(kor.yil, kor.oy, 1) < bugungi.slice(0, 7) + '-01'
  const oldingiBor = kalit(kor.yil, kor.oy, 1) > min

  const bosildi = s => {
    if (mode === 'single') { onChange?.(s); onYopish?.(); return }
    // range
    if (rejim === 'bosh')  { onRange?.(s, s); setRejim('oxir') }
    else if (s >= from)    { onRange?.(from, s); setRejim('bosh') }
    else                   { onRange?.(s, to); setRejim('bosh') }
  }

  return (
    <div>
      {/* Oy boshqaruvi */}
      <div className="flex items-center gap-1 mb-1">
        <button onClick={() => surish(-1)} disabled={!oldingiBor} aria-label="Oldingi oy"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors disabled:opacity-25">
          <ChevronLeft size={18} />
        </button>
        <p className="flex-1 text-center text-sm font-bold text-ctext">
          {UZ_MONTHS[kor.oy].replace(/^./, c => c.toUpperCase())} {kor.yil}
        </p>
        <button onClick={() => surish(1)} disabled={!keyingiBor} aria-label="Keyingi oy"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors disabled:opacity-25">
          <ChevronRight size={18} />
        </button>
        {onYopish && (
          <button onClick={onYopish} aria-label="Yopish"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-text-sub hover:text-ctext hover:bg-cbg transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {mode === 'range' && (
        <p className="text-[11px] font-semibold text-primary text-center mb-1.5">
          {rejim === 'bosh' ? 'Boshlanish kunini tanlang' : 'Tugash kunini tanlang'}
        </p>
      )}

      <div className="grid grid-cols-7 mb-0.5">
        {HAFTA.map(h => (
          <span key={h} className="text-center text-[11px] font-semibold text-text-sub py-1">{h}</span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {kataklar.map((d, i) => {
          if (!d) return <span key={i} />
          const s      = kalit(kor.yil, kor.oy, d)
          const yopiq  = s > bugungi || s < min
          const ichida = mode === 'range' ? (from && to && s >= from && s <= to) : false
          const chekka = mode === 'range' ? (s === from || s === to) : (s === value)
          const yozuvBor = kunlar?.has(s)

          return (
            <button key={i} onClick={() => bosildi(s)} disabled={yopiq}
              className={`relative h-11 text-sm font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed
                ${ichida && !chekka ? 'bg-blue-bg text-ctext' : ''}
                ${chekka ? 'bg-primary text-white font-bold rounded-xl' : ''}
                ${!ichida && !chekka ? 'text-ctext hover:bg-cbg rounded-xl' : ''}
                ${s === bugungi && !chekka ? 'ring-1 ring-inset ring-primary/40 rounded-xl' : ''}`}>
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
