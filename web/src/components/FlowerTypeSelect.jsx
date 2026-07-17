// Gul turi tanlash: bazadagi ro'yxat + istalgan turni qo'lda yozish imkoni
import { useState, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import BottomModal from './BottomModal'
import { cachedFlowerTypes, loadFlowerTypes } from '../lib/flowers'

// boxed — forma ichida input ko'rinishida (ramkali); aks holda karta qatori ko'rinishida
export default function FlowerTypeSelect({ value, onChange, placeholder = 'Gul turini tanlang', boxed = false }) {
  const [open, setOpen]     = useState(false)
  const [custom, setCustom] = useState('')
  const [types, setTypes]   = useState(cachedFlowerTypes())

  // Modal ochilganda ro'yxatni serverdan yangilaymiz — admin qo'shgan tur darhol ko'rinadi
  useEffect(() => {
    if (!open) return
    let alive = true
    loadFlowerTypes().then(list => { if (alive) setTypes([...list]) })
    return () => { alive = false }
  }, [open])

  const isCustom = !!value && !types.includes(value)

  function pick(v) {
    onChange(v)
    setOpen(false)
    setCustom('')
  }

  function openModal() {
    setCustom(isCustom ? value : '')
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={boxed
          ? 'flex items-center justify-between w-full h-11 px-3 rounded-xl border border-cborder bg-cbg text-left hover:border-primary transition-colors'
          : 'flex items-center justify-between w-full px-4 py-3.5 text-left'}
      >
        <span className={boxed
          ? `text-sm ${value ? 'text-ctext font-medium' : 'text-text-sub'}`
          : `text-base ${value ? 'text-ctext font-semibold' : 'text-text-sub'}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-text-sub shrink-0" />
      </button>

      <BottomModal open={open} onClose={() => setOpen(false)} title={placeholder}>
        {types.map(t => (
          <button
            key={t}
            onClick={() => pick(t)}
            className={`flex items-center justify-between w-full px-5 py-4 text-base font-medium transition-colors ${
              t === value ? 'text-primary bg-blue-bg' : 'text-ctext hover:bg-cbg'
            }`}
          >
            {t}
            {t === value && <Check size={16} />}
          </button>
        ))}

        {/* Boshqa tur — qo'lda yozish (bir martalik, ro'yxatga kirmaydi) */}
        <div className="px-5 pt-4 pb-2 border-t border-separator mt-1">
          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">
            Boshqa tur — o'zingiz yozing
          </p>
          <div className="flex gap-2">
            <input
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) pick(custom.trim()) }}
              placeholder="Masalan: Roza qizil"
              className="flex-1 h-11 px-3 rounded-xl border border-cborder bg-cbg text-ctext text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => custom.trim() && pick(custom.trim())}
              disabled={!custom.trim()}
              className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              OK
            </button>
          </div>
          {isCustom && (
            <p className="text-xs text-text-sub mt-2">
              Hozirgi tur: <span className="font-semibold text-primary">{value}</span>
            </p>
          )}
        </div>
      </BottomModal>
    </>
  )
}
