import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { formatSanaUz } from '../lib/date'
import Kalendar from './Kalendar'

// Formalar uchun bitta sana maydoni — ichki kalendar bilan (native <input type="date"> emas).
// Sana o'zbekcha ko'rinadi ("24-iyul"), bosilganda kalendar ochiladi, kun tanlansa yopiladi.
export default function SanaTanla({ value, onChange, min }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-11 px-3 rounded-xl border border-cborder bg-cbg flex items-center gap-2.5 text-left hover:border-primary transition-colors">
        <CalendarDays size={15} className="text-text-sub shrink-0" />
        <span className="flex-1 text-sm font-medium text-ctext">{value ? formatSanaUz(value) : 'Sana tanlang'}</span>
        <ChevronDown size={14} className={`text-text-sub shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 bg-ccard border border-cborder rounded-2xl p-3">
          <Kalendar mode="single" value={value} min={min} onChange={onChange} onYopish={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
