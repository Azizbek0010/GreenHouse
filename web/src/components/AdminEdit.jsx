// Admin edit/delete uchun umumiy UI bo'laklari
import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'

// Ikki bosqichli o'chirish tugmasi — browser confirm o'rniga
export function DeleteButton({ onConfirm, loading, label = "O'chirish", className = '' }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full h-[50px] rounded-xl font-semibold text-base transition-colors disabled:opacity-60 ${
        armed ? 'bg-cred text-white' : 'border-[1.5px] border-cred text-cred bg-ccard hover:bg-red-bg'
      } ${className}`}
    >
      <Trash2 size={18} />
      {loading ? "O'chirilmoqda..." : armed ? "Rostdan o'chirilsinmi?" : label}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-sub mb-1.5">{label}</p>
      {children}
    </div>
  )
}

export const inputCls =
  'w-full h-11 px-3 rounded-xl border border-cborder bg-cbg text-ctext text-sm outline-none focus:border-primary'
