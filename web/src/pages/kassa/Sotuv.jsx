import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import SanaField from '../../components/SanaField'
import FlowerTypeSelect from '../../components/FlowerTypeSelect'
import RazmerButtons from '../../components/RazmerButtons'

function money(n)    { return (n || 0).toLocaleString('ru-RU') }
function num(s)      { return parseInt(String(s).replace(/\s/g, '')) || 0 }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }

// ── One flower line item ──────────────────────────────────────────
function FlowerRow({ item, onChange, onRemove, canRemove }) {
  const update = (field, val) => onChange({ ...item, [field]: val })

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      {/* Header row: type + remove */}
      <div className="flex items-center border-b border-separator">
        <div className="flex-1">
          <FlowerTypeSelect
            value={item.type}
            onChange={v => update('type', v)}
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

      {/* Razmer */}
      <div className="px-4 py-3 border-b border-separator">
        <p className="text-xs text-text-sub mb-2 font-medium">Razmer</p>
        <RazmerButtons value={item.razmer} onChange={z => update('razmer', z)} />
      </div>

      {/* Soni va narx */}
      <div className="flex items-center px-4 py-3 border-b border-separator">
        <span className="flex-1 text-sm text-ctext">Soni</span>
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
      <div className="flex items-center px-4 py-3">
        <span className="flex-1 text-sm text-ctext">Narx (dona)</span>
        <input
          type="text"
          inputMode="numeric"
          value={fmtInput(item.narx)}
          onChange={e => update('narx', e.target.value.replace(/[\s\D]/g, ''))}
          placeholder="0"
          className="w-28 text-right bg-transparent text-ctext text-base font-semibold outline-none"
        />
        <span className="text-text-sub ml-1.5 text-sm">so'm</span>
      </div>

      {/* Subtotal */}
      {num(item.qty) > 0 && num(item.narx) > 0 && (
        <div className="px-4 py-2.5 bg-blue-bg border-t border-separator">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary">{num(item.qty)} × {money(num(item.narx))}</span>
            <span className="text-sm font-bold text-primary">{money(num(item.qty) * num(item.narx))} so'm</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/20">
            <span className="text-xs text-primary/70">Chegirma bilan (ixtiyoriy)</span>
            <input
              type="text"
              inputMode="numeric"
              value={fmtInput(item.chegirma)}
              onChange={e => update('chegirma', e.target.value.replace(/[\s\D]/g, ''))}
              placeholder="Yakuniy narx"
              className="w-32 text-right bg-transparent text-primary text-sm font-semibold outline-none placeholder:text-primary/40"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
const newItem = () => ({ id: Date.now() + Math.random(), type: '', razmer: null, qty: '', narx: '', chegirma: '', holat: 'yaxshi' })
function itemTotal(it) {
  const orig = num(it.qty) * num(it.narx)
  const disc = num(it.chegirma)
  return disc > 0 ? disc : orig
}

export default function Sotuv() {
  const navigate = useNavigate()
  const [items, setItems]   = useState([newItem()])
  const [sana, setSana]     = useState('')   // bo'sh = bugun
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const updateItem = (id, updated) => setItems(prev => prev.map(it => it.id === id ? updated : it))
  const removeItem = (id)          => setItems(prev => prev.filter(it => it.id !== id))
  const addItem    = ()            => setItems(prev => [...prev, newItem()])

  const total    = items.reduce((s, it) => s + itemTotal(it), 0)
  const totalQty = items.reduce((s, it) => s + num(it.qty), 0)

  const onSave = async () => {
    for (const it of items) {
      if (!it.type)             return setError('Gul turini tanlang')
      if (!it.razmer)           return setError('Razmerni tanlang')
      if (!(num(it.qty)  > 0)) return setError('Sonni kiriting')
      if (!(num(it.narx) > 0)) return setError('Narxni kiriting')
      if (num(it.chegirma) > 0 && num(it.chegirma) > num(it.qty) * num(it.narx))
        return setError("Chegirma narxi asl narxdan yuqori bo'lishi mumkin emas")
    }
    setError(''); setSaving(true)
    try {
      await Promise.all(items.map(it => api.post('/api/sotuv', {
        flowerType:   it.type,
        razmer:       it.razmer,
        qty:          num(it.qty),
        holat:        it.holat,
        pricePerUnit: num(it.narx),
        discountPrice: num(it.chegirma) > 0 ? num(it.chegirma) : undefined,
        sana: sana || undefined,
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
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-1">Yangi sotuv</h1>
      <p className="text-sm text-text-sub mb-5">Bir sotuv ichida bir nechta gul turini qo'shing</p>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Flower items */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Kelgan gullar</p>

      {items.map((item) => (
        <FlowerRow
          key={item.id}
          item={item}
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

      {/* Holat */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Holat</p>
      {/* Segment-tanlagich: to'ldirilgan ikkita katta tugma asosiy "Saqlash"
          tugmasidan kuchliroq ko'rinib, e'tiborni o'g'irlab turardi */}
      <div className="flex gap-1 p-1 mb-5 bg-cbg border border-cborder rounded-xl">
        {[{ key: 'yaxshi', label: 'Yaxshi' }, { key: 'nuqsonli', label: 'Nuqsonli' }].map(h => {
          const active = items[0]?.holat === h.key
          return (
            <button
              key={h.key}
              onClick={() => setItems(prev => prev.map(it => ({ ...it, holat: h.key })))}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? `bg-ccard shadow-sm ${h.key === 'yaxshi' ? 'text-cgreen' : 'text-corange'}`
                  : 'text-text-sub hover:text-ctext'
              }`}
            >
              {h.label}
            </button>
          )
        })}
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="bg-blue-bg border border-primary/20 rounded-2xl p-4 flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-primary font-semibold">Jami summa</p>
            <p className="text-xs text-primary/70 mt-0.5">{items.length} tur · {totalQty} ta gul</p>
          </div>
          <p className="text-2xl font-bold text-primary">{money(total)} <span className="text-base font-medium">s</span></p>
        </div>
      )}

      {/* Sana — ixtiyoriy, eng pastda */}
      <SanaField value={sana} onChange={setSana} />

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {saving
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Check size={18} /> Sotuvni saqlash</>
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
