import { TrendingUp, TrendingDown } from 'lucide-react'

// Statistika sahifalarining umumiy bo'laklari.
// Admin va kassa sahifalari bir xil ko'rinishda bo'lishi uchun bitta joyda:
// avval bu komponentlar admin/Statistika.jsx ichida edi, kassa sahifasi
// qo'shilganda nusxa ko'chirmaslik uchun shu yerga chiqarildi.

export function money(n) { return (n || 0).toLocaleString('ru-RU') }

// O'sish / tushish belgisi (oldingi davr bilan solishtirish)
export function Trend({ cur, prev }) {
  if (prev === undefined || prev === null) return null
  const diff = cur - prev
  const pct  = prev === 0 ? (cur > 0 ? 100 : 0) : Math.abs(Math.round((diff / prev) * 100))
  if (diff === 0) return <span className="text-xs text-text-sub">—</span>
  const up = diff > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
      up ? 'bg-green-bg text-cgreen' : 'bg-red-bg text-cred'
    }`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {pct}%
    </span>
  )
}

export function MetricRow({ label, cur, prev, unit = "so'm", color, divider }) {
  return (
    <>
      {divider && <div className="h-px bg-separator" />}
      <div className="flex items-center justify-between py-3.5 px-4">
        <p className="text-sm text-text-sub">{label}</p>
        <div className="flex items-center gap-2">
          <Trend cur={cur} prev={prev} />
          <p className={`text-sm font-bold ${color || 'text-ctext'}`}>
            {money(cur)} <span className="font-normal text-xs text-text-sub">{unit}</span>
          </p>
        </div>
      </div>
    </>
  )
}

export function BarRow({ name, value, displayVal, max, color = 'bg-primary', emoji }) {
  const pct = Math.round((value / Math.max(1, max)) * 100)
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-base leading-none">{emoji}</span>}
          <span className="text-sm font-semibold text-ctext">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ctext">{displayVal}</span>
          <span className="text-xs text-text-sub bg-cbg px-1.5 py-0.5 rounded-md font-medium">{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-cbg overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SLabel({ icon: Icon, label, iconColor, iconBg, action }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={13} className={iconColor} />
        </div>
        <p className="text-xs font-bold text-text-sub uppercase tracking-wider">{label}</p>
      </div>
      {action}
    </div>
  )
}

export function StatPill({ value, label, color, bg }) {
  return (
    <div className={`flex-1 ${bg} rounded-2xl p-4 flex flex-col items-center gap-1 min-w-0`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-semibold text-text-sub text-center leading-tight">{label}</p>
    </div>
  )
}
