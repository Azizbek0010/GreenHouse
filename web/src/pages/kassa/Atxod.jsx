import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Info, Check, Plus, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'
import { useStockMap, stockRemaining, StockTypeSelect, StockSizeButtons } from '../../components/StockFlowerPicker'

const SABABLAR = [
  { key: "so'lgan",  label: "So'lgan",  emoji: '🥀' },
  { key: 'nuqsonli', label: 'Nuqsonli', emoji: '⚠️' },
  { key: 'singan',   label: 'Singan',   emoji: '💔' },
  { key: 'boshqa',   label: 'Boshqa',   emoji: '📦' },
]

function money(n)    { return (n || 0).toLocaleString('ru-RU') }
function num(s)      { return parseInt(String(s).replace(/\s/g, '')) || 0 }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }

// ── Bottom-sheet modal picker ──────────────────────────────────────
function SelectModal({ options, value, onChange, placeholder = 'Tanlang...' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <span className={`text-base ${value ? 'text-ctext font-semibold' : 'text-text-sub'}`}>
          {typeof value === 'string'
            ? (options.find(o => (typeof o === 'object' ? o.key : o) === value)?.label ?? value) || placeholder
            : placeholder}
        </span>
        <ChevronDown size={16} className="text-text-sub shrink-0" />
      </button>

      <BottomModal open={open} onClose={() => setOpen(false)} title={placeholder}>
        {options.map(opt => {
          const label = typeof opt === 'string' ? opt : opt.label
          const key   = typeof opt === 'string' ? opt : opt.key
          const emoji = typeof opt === 'object' ? opt.emoji : null
          return (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false) }}
              className={`flex items-center gap-3 w-full px-5 py-4 text-base font-medium transition-colors ${
                key === value ? 'text-primary bg-blue-bg' : 'text-ctext hover:bg-cbg'
              }`}
            >
              {emoji && <span>{emoji}</span>}
              <span className="flex-1 text-left">{label}</span>
              {key === value && <Check size={16} />}
            </button>
          )
        })}
      </BottomModal>
    </>
  )
}

// ── One flower line item ──────────────────────────────────────────
function FlowerRow({ item, onChange, onRemove, canRemove, stock }) {
  const update = (field, val) => onChange({ ...item, [field]: val })
  const remaining = item.type && item.razmer ? stockRemaining(stock, item.type, item.razmer) : null

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      <div className="flex items-center border-b border-separator">
        <div className="flex-1">
          <StockTypeSelect
            stock={stock}
            value={item.type}
            onChange={v => onChange({ ...item, type: v, razmer: null })}
          />
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="w-12 flex items-center justify-center text-cred hover:bg-red-bg transition-colors self-stretch"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-separator">
        <p className="text-xs text-text-sub mb-2 font-medium">Razmer</p>
        <StockSizeButtons
          stock={stock}
          type={item.type}
          value={item.razmer}
          onChange={z => update('razmer', z)}
        />
      </div>

      <div className="flex items-center px-4 py-3 border-b border-separator">
        <span className="flex-1 text-sm text-ctext">
          Soni
          {remaining != null && (
            <span className={`ml-2 text-xs ${num(item.qty) > remaining ? 'text-cred font-semibold' : 'text-text-sub'}`}>
              (omborda {remaining} ta)
            </span>
          )}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={item.qty}
          onChange={e => update('qty', e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-20 text-right bg-transparent text-ctext text-base font-semibold outline-none"
        />
        <span className="text-text-sub ml-1.5 text-sm">ta</span>
      </div>
      <div className="flex items-center px-4 py-3 border-b border-separator">
        <span className="flex-1 text-sm text-ctext">Qiymat (dona)</span>
        <input
          type="text"
          inputMode="numeric"
          value={fmtInput(item.qiymat)}
          onChange={e => update('qiymat', e.target.value.replace(/[\s\D]/g, ''))}
          placeholder="0"
          className="w-28 text-right bg-transparent text-ctext text-base font-semibold outline-none"
        />
        <span className="text-text-sub ml-1.5 text-sm">so'm</span>
      </div>

      <div className="border-b border-separator">
        <SelectModal
          options={SABABLAR}
          value={item.sabab}
          onChange={v => update('sabab', v)}
          placeholder="Sababni tanlang"
        />
      </div>

      {num(item.qty) > 0 && num(item.qiymat) > 0 && (
        <div className="px-4 py-2.5 bg-red-bg border-t border-separator flex items-center justify-between">
          <span className="text-xs text-cred">{num(item.qty)} × {money(num(item.qiymat))}</span>
          <span className="text-sm font-bold text-cred">{money(num(item.qty) * num(item.qiymat))} so'm</span>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
const newItem = () => ({ id: Date.now() + Math.random(), type: '', razmer: null, qty: '', qiymat: '', sabab: '' })

export default function KassaAtxod() {
  const navigate = useNavigate()
  const { stock } = useStockMap()
  const [items, setItems]   = useState([newItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const updateItem = (id, updated) => setItems(prev => prev.map(it => it.id === id ? updated : it))
  const removeItem = (id)          => setItems(prev => prev.filter(it => it.id !== id))
  const addItem    = ()            => setItems(prev => [...prev, newItem()])

  const total    = items.reduce((s, it) => s + num(it.qty) * num(it.qiymat), 0)
  const totalQty = items.reduce((s, it) => s + num(it.qty), 0)

  const onSave = async () => {
    for (const it of items) {
      if (!it.type)               return setError('Gul turini tanlang')
      if (!it.razmer)             return setError('Razmerni tanlang')
      if (!(num(it.qty) > 0))     return setError("Soni musbat son bo'lishi kerak")
      if (!(num(it.qiymat) > 0))  return setError("Qiymatni kiriting (so'm)")
      if (!it.sabab)              return setError('Sababni tanlang')
    }
    // Ombor limiti: bir xil (tur, razmer) qatorlar jami qoldiqdan oshmasin
    const need = new Map()
    for (const it of items) {
      const k = `${it.type}|${it.razmer}`
      need.set(k, (need.get(k) || 0) + num(it.qty))
    }
    for (const [k, qty] of need) {
      const [t, sm] = k.split('|')
      const have = stockRemaining(stock, t, Number(sm))
      if (qty > have) return setError(`Omborda ${t} ${sm}sm dan faqat ${have} ta qolgan`)
    }

    setError(''); setSaving(true)
    try {
      await Promise.all(items.map(it => api.post('/api/atxod', {
        flowerType: it.type,
        razmer:     it.razmer,
        qty:        num(it.qty),
        sabab:      it.sabab,
        qiymat:     num(it.qiymat),
      })))
      navigate('/kassa')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline">
        <ArrowLeft size={16} /> Ortga
      </button>
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-1">Atxod kiritish</h1>
      <p className="text-sm text-text-sub mb-5">Bir kiritishda bir nechta gul turini qo'shing</p>

      <div className="flex items-start gap-3 bg-blue-bg border-l-4 border-primary rounded-2xl p-4 mb-5">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Admin tekshiruvi</p>
          <p className="text-xs text-primary/70 mt-0.5">Atxod admin tekshiruvidan o'tadi.</p>
        </div>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Flower items */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Yo'qolgan gullar</p>

      {items.map(item => (
        <FlowerRow
          key={item.id}
          item={item}
          stock={stock}
          onChange={updated => updateItem(item.id, updated)}
          onRemove={() => removeItem(item.id)}
          canRemove={items.length > 1}
        />
      ))}

      <button
        onClick={addItem}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-cborder text-text-sub text-sm font-semibold hover:border-primary hover:text-primary transition-colors mb-5"
      >
        <Plus size={16} />
        Gul qo'shish
      </button>

      {/* Total */}
      {total > 0 && (
        <div className="bg-red-bg border border-cred/20 rounded-2xl p-4 flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-cred font-semibold">Jami yo'qotish</p>
            <p className="text-xs text-cred/70 mt-0.5">{items.length} tur · {totalQty} ta gul</p>
          </div>
          <p className="text-2xl font-bold text-cred">{money(total)} <span className="text-base font-medium">s</span></p>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-cred text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {saving
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Trash2 size={18} /> Atxodni saqlash</>
        }
      </button>
      <button
        onClick={() => navigate(-1)}
        className="w-full h-11 rounded-xl border border-cborder text-text-sub text-sm font-medium hover:bg-cbg transition-colors"
      >
        Bekor qilish
      </button>
    </div>
  )
}
