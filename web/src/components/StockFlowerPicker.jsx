// Ombor asosidagi gul tanlash (kassa sotuv/qarz/atxod formalari uchun):
// faqat qoldig'i bor tur va razmerlar tanlanadi, qo'lda yozish YO'Q —
// kassa faqat qabul qilingan gulni ishlatadi.
import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import BottomModal from './BottomModal'
import { loadStock, groupStock } from '../lib/stock'

// Qoldiqni yuklab, tur bo'yicha guruhlab beradi
export function useStockMap() {
  const [stock, setStock] = useState(new Map())
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    try {
      const rows = await loadStock()
      setStock(groupStock(rows))
    } catch { /* ombor yuklanmasa — ro'yxat bo'sh qoladi */ }
    setLoaded(true)
  }, [])

  useEffect(() => { reload() }, [reload])
  return { stock, loaded, reload }
}

// (type, razmer) bo'yicha qoldiq
export function stockRemaining(stock, type, razmer) {
  const g = stock.get(type)
  if (!g) return 0
  const s = g.sizes.find(x => x.razmer === razmer)
  return s ? s.remaining : 0
}

// Tur tanlash — faqat jami qoldig'i > 0 bo'lgan turlar
export function StockTypeSelect({ value, onChange, stock, placeholder = 'Gul turini tanlang' }) {
  const [open, setOpen] = useState(false)
  const types = [...stock.entries()]
    .filter(([, g]) => g.total > 0)
    .map(([name, g]) => ({ name, total: g.total }))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <span className={`text-base ${value ? 'text-ctext font-semibold' : 'text-text-sub'}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-text-sub shrink-0" />
      </button>

      <BottomModal open={open} onClose={() => setOpen(false)} title={placeholder}>
        {types.map(t => (
          <button
            key={t.name}
            onClick={() => { onChange(t.name); setOpen(false) }}
            className={`flex items-center justify-between w-full px-5 py-4 text-base font-medium transition-colors ${
              t.name === value ? 'text-primary bg-blue-bg' : 'text-ctext hover:bg-cbg'
            }`}
          >
            <span>{t.name}</span>
            <span className="flex items-center gap-2 text-sm text-text-sub">
              {t.total} ta
              {t.name === value && <Check size={16} className="text-primary" />}
            </span>
          </button>
        ))}
        {types.length === 0 && (
          <p className="px-5 py-6 text-sm text-text-sub text-center">
            Omborda gul yo'q — avval teplitsadan partiya qabul qiling
          </p>
        )}
      </BottomModal>
    </>
  )
}

// Razmer tugmalari — faqat tanlangan turning qoldig'i bor razmerlari, soni bilan
export function StockSizeButtons({ stock, type, value, onChange }) {
  const g = stock.get(type)
  const sizes = g ? g.sizes.filter(s => s.remaining > 0) : []

  if (!type) return <p className="text-xs text-text-sub">Avval gul turini tanlang</p>
  if (sizes.length === 0) return <p className="text-xs text-text-sub">Bu turdan omborda qolmagan</p>

  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map(s => (
        <button
          key={s.razmer}
          onClick={() => onChange(s.razmer)}
          className={`px-3 h-8 rounded-lg text-sm font-medium transition-colors border ${
            value === s.razmer
              ? 'bg-primary text-white border-primary'
              : 'bg-cbg text-ctext border-cborder hover:border-primary'
          }`}
        >
          {s.razmer}sm · {s.remaining}
        </button>
      ))}
    </div>
  )
}
