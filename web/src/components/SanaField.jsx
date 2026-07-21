import { CalendarDays, ChevronDown, X } from 'lucide-react'
import { todayLocal, formatSanaUz, MIN_SANA } from '../lib/date'

// Ixtiyoriy sana maydoni — formaning eng pastida, saqlash tugmasidan yuqorida.
// Bo'sh bo'lsa yozuv bugungi kunga tushadi, sana tanlansa — o'sha kunga.
//
// Nega native input ustiga o'z matnimizni chizamiz:
// <input type="date"> o'zining "dd.mm.yyyy" (yoki ruscha "дд.мм.гггг") shablonini
// brauzer tiliga qarab ko'rsatadi va uni o'zgartirib bo'lmaydi — o'zbekcha
// interfeysda bu begona ko'rinadi. Shuning uchun input shaffof qilinadi
// (kalendar baribir ochiladi), ustiga "Bugun" yoki "15-yanvar" deb yozamiz.
export default function SanaField({ value, onChange, label = 'Sana', min = MIN_SANA }) {
  const isSet = Boolean(value)

  return (
    <div className="relative bg-ccard border border-cborder rounded-2xl mb-4 transition-colors hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      {/* Butun qatorni qoplaydigan shaffof input: bosilgan joydan qat'i nazar kalendar ochiladi */}
      <input
        type="date"
        value={value || ''}
        min={min}
        max={todayLocal()}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex items-center gap-3 px-4 py-3.5 pointer-events-none">
        <CalendarDays size={16} className="text-text-sub shrink-0" />
        <span className="flex-1 text-sm text-ctext">{label}</span>

        <span className={`text-sm font-semibold tabular ${isSet ? 'text-primary' : 'text-text-sub'}`}>
          {isSet ? formatSanaUz(value) : 'Bugun'}
        </span>

        {isSet ? (
          <button
            onClick={() => onChange('')}
            title="Bugungi sanaga qaytarish"
            className="pointer-events-auto relative z-10 w-6 h-6 -mr-1 flex items-center justify-center rounded-md text-text-sub hover:text-cred hover:bg-cbg transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={16} className="text-text-sub shrink-0" />
        )}
      </div>
    </div>
  )
}
