// Shared UI компоненты — Badge, StatCard, кнопки
import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { API_URL } from '../lib/config'

const BADGE = {
  yolda:         { bg: 'bg-blue-bg',   text: 'text-[#2c5282] dark:text-[#93c5fd]', dot: 'bg-[#2c5282] dark:bg-[#93c5fd]', label: "Yo'lda" },
  qabul_qilindi: { bg: 'bg-green-bg',  text: 'text-[#16723f] dark:text-[#4ade80]', dot: 'bg-[#16723f] dark:bg-[#4ade80]', label: 'Qabul qilindi' },
  farq_bor:      { bg: 'bg-red-bg',    text: 'text-[#b02a2a] dark:text-[#f87171]', dot: 'bg-[#b02a2a] dark:bg-[#f87171]', label: 'Farq bor' },
  pending:       { bg: 'bg-orange-bg', text: 'text-[#9a5b08] dark:text-[#fb923c]', dot: 'bg-[#9a5b08] dark:bg-[#fb923c]', label: 'Kutilmoqda' },
  approved:      { bg: 'bg-green-bg',  text: 'text-[#16723f] dark:text-[#4ade80]', dot: 'bg-[#16723f] dark:bg-[#4ade80]', label: 'Tasdiqlandi' },
  rejected:      { bg: 'bg-red-bg',    text: 'text-[#b02a2a] dark:text-[#f87171]', dot: 'bg-[#b02a2a] dark:bg-[#f87171]', label: 'Rad etildi' },
}

export function Badge({ status }) {
  const b = BADGE[status] || { bg: 'bg-cbg', text: 'text-cgray', dot: 'bg-cgray', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold ${b.bg} ${b.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
      {b.label}
    </span>
  )
}

export function PrimaryButton({ title, onClick, loading, disabled, icon, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 w-full h-[50px] rounded-xl bg-primary text-white font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>{icon}{title}</>
      )}
    </button>
  )
}

export function OutlineButton({ title, onClick, icon, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 w-full h-[50px] rounded-xl border-[1.5px] border-primary text-primary bg-ccard font-semibold text-base hover:bg-blue-bg transition-colors ${className}`}
    >
      {icon}{title}
    </button>
  )
}

export function GhostButton({ title, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-full h-[50px] rounded-xl border-[1.5px] border-cborder text-cgray font-medium text-base hover:bg-cbg transition-colors ${className}`}
    >
      {title}
    </button>
  )
}

export function StatCard({ label, value, unit, icon, bg = 'bg-blue-bg', textColor = 'text-primary' }) {
  return (
    <div className="flex-1 bg-ccard rounded-2xl border border-cborder p-4 min-w-0">
      {icon && (
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3 ${textColor}`}>
          {icon}
        </div>
      )}
      <p className="text-[11px] font-semibold text-text-sub uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-ctext mt-1 leading-none">{value}</p>
      {unit && <p className="text-xs text-cgray mt-1">{unit}</p>}
    </div>
  )
}

export function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-5 pb-2 pt-1">
      {children}
    </p>
  )
}

export function CardGroup({ children }) {
  return (
    <div className="bg-ccard rounded-2xl border border-cborder mx-5 overflow-hidden">
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Rasm ko'rsatadi; yo'q bo'lsa yoki yuklanmasa → "Rasm yo'q" placeholder
export function SafeImg({ src, className = 'w-full h-44' }) {
  const [err, setErr] = useState(false)
  const url = src ? (src.startsWith('http') ? src : `${API_URL}${src}`) : null
  if (!url || err) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-2 bg-cbg border-b border-cborder`}>
        <ImageOff size={22} className="text-cgray" />
        <span className="text-xs text-cgray font-medium">Rasm yo'q</span>
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      className={`${className} object-cover`}
      onError={() => setErr(true)}
    />
  )
}

export function EmptyState({ text = "Ma'lumot yo'q" }) {
  return <p className="text-center text-cgray text-sm py-8">{text}</p>
}

export function ErrorMsg({ msg, onClose }) {
  if (!msg) return null
  return (
    <div className="mx-5 mb-3 p-3 bg-red-bg border border-cred rounded-xl text-[#b02a2a] dark:text-red-300 text-sm flex items-center justify-between gap-2">
      <span>{msg}</span>
      {onClose && <button onClick={onClose} className="text-lg leading-none">×</button>}
    </div>
  )
}
