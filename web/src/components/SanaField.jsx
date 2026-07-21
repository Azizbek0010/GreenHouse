import { CalendarDays, X } from 'lucide-react'
import { todayLocal, MIN_SANA } from '../lib/date'

// Ixtiyoriy sana maydoni — formaning eng pastida, saqlash tugmasidan yuqorida.
// Bo'sh bo'lsa yozuv bugungi kunga tushadi (avvalgidek), sana tanlansa — o'sha kunga.
export default function SanaField({ value, onChange, label = 'Sana', hint = "Bo'sh qoldirsangiz — bugungi sana", min = MIN_SANA }) {
  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center px-4 py-3">
        <span className="flex-1 text-sm text-ctext flex items-center gap-2">
          <CalendarDays size={15} className="text-text-sub" />
          {label}
        </span>
        <input
          type="date"
          value={value || ''}
          min={min}
          max={todayLocal()}
          onChange={e => onChange(e.target.value)}
          className="bg-transparent text-ctext text-sm font-semibold outline-none text-right"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            title="Bugungi sanaga qaytarish"
            className="ml-2 w-6 h-6 flex items-center justify-center rounded-md text-text-sub hover:bg-cbg transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <p className="px-4 pb-3 text-[11px] text-text-sub">{hint}</p>
    </div>
  )
}
