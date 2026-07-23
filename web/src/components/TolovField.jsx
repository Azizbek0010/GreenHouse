import { Banknote, CreditCard } from 'lucide-react'

// To'lov usuli — naqt / karta.
// Holat maydonidagi kabi segment-tanlagich: ikkita to'ldirilgan tugma
// asosiy "Saqlash" tugmasidan kuchliroq ko'rinib qolardi.
const USULLAR = [
  { key: 'naqt',  label: 'Naqt',  icon: Banknote,   color: 'text-cgreen' },
  { key: 'karta', label: 'Karta', icon: CreditCard, color: 'text-primary' },
]

export default function TolovField({ value, onChange, label = "To'lov usuli", className = '' }) {
  return (
    <div className={className}>
      {label && (
        <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">{label}</p>
      )}
      <div className="flex gap-1 p-1 bg-cbg border border-cborder rounded-xl">
        {USULLAR.map(u => {
          const Icon = u.icon
          const active = value === u.key
          return (
            <button
              key={u.key}
              type="button"
              onClick={() => onChange(u.key)}
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
