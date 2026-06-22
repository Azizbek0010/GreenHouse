import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

const TYPES = ['Roza', 'Lola', 'Xrizantema', 'Gerbera', 'Gladiolus', 'Pion', 'Boshqa']
const SIZES = [50, 60, 70, 80, 90, 100, 110]

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
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-text-sub shrink-0" />
      </button>

      <BottomModal open={open} onClose={() => setOpen(false)} title={placeholder}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => { onChange(opt); setOpen(false) }}
            className={`flex items-center justify-between w-full px-5 py-4 text-base font-medium transition-colors ${
              opt === value ? 'text-primary bg-blue-bg' : 'text-ctext hover:bg-cbg'
            }`}
          >
            {opt}
            {opt === value && <Check size={16} />}
          </button>
        ))}
      </BottomModal>
    </>
  )
}

// ── One flower line item ──────────────────────────────────────────
function FlowerRow({ item, onChange, onRemove, canRemove }) {
  const update = (field, val) => onChange({ ...item, [field]: val })

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      {/* Header row: type + remove */}
      <div className="flex items-center border-b border-separator">
        <div className="flex-1">
          <SelectModal
            options={TYPES}
            value={item.type}
            onChange={v => update('type', v)}
            placeholder="Gul turini tanlang"
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
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map(z => (
            <button
              key={z}
              onClick={() => update('razmer', z)}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-colors border ${
                item.razmer === z
                  ? 'bg-primary text-white border-primary'
                  : 'bg-cbg text-ctext border-cborder hover:border-primary'
              }`}
            >
              {z}sm
            </button>
          ))}
        </div>
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
        <div className="px-4 py-2.5 bg-blue-bg border-t border-separator flex items-center justify-between">
          <span className="text-xs text-primary">{num(item.qty)} × {money(num(item.narx))}</span>
          <span className="text-sm font-bold text-primary">{money(num(item.qty) * num(item.narx))} so'm</span>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
const newItem = () => ({ id: Date.now() + Math.random(), type: '', razmer: null, qty: '', narx: '', holat: 'yaxshi' })

export default function Sotuv() {
  const navigate = useNavigate()
  const [items, setItems]   = useState([newItem()])
  const [photo, setPhoto]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const updateItem = (id, updated) => setItems(prev => prev.map(it => it.id === id ? updated : it))
  const removeItem = (id)          => setItems(prev => prev.filter(it => it.id !== id))
  const addItem    = ()            => setItems(prev => [...prev, newItem()])

  const total    = items.reduce((s, it) => s + num(it.qty) * num(it.narx), 0)
  const totalQty = items.reduce((s, it) => s + num(it.qty), 0)

  const onSave = async () => {
    for (const it of items) {
      if (!it.type)             return setError('Gul turini tanlang')
      if (!it.razmer)           return setError('Razmerni tanlang')
      if (!(num(it.qty)  > 0)) return setError('Sonni kiriting')
      if (!(num(it.narx) > 0)) return setError('Narxni kiriting')
    }
    setError(''); setSaving(true)
    try {
      await Promise.all(items.map(it => {
        const form = new FormData()
        form.append('flowerType',   it.type)
        form.append('razmer',       String(it.razmer))
        form.append('qty',          String(num(it.qty)))
        form.append('holat',        it.holat)
        form.append('pricePerUnit', String(num(it.narx)))
        if (photo) form.append('photo', photo)
        return api.postForm('/api/sotuv', form)
      }))
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
      <div className="flex gap-2 mb-5">
        {[{ key: 'yaxshi', label: 'Yaxshi' }, { key: 'nuqsonli', label: 'Nuqsonli' }].map(h => (
          <button
            key={h.key}
            onClick={() => setItems(prev => prev.map(it => ({ ...it, holat: h.key })))}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors border ${
              items[0]?.holat === h.key
                ? h.key === 'yaxshi' ? 'bg-cgreen text-white border-cgreen' : 'bg-corange text-white border-corange'
                : 'bg-ccard text-text-sub border-cborder'
            }`}
          >
            {h.label}
          </button>
        ))}
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

      {/* Photo */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Rasm (ixtiyoriy)</p>
      <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-cborder bg-ccard hover:border-primary cursor-pointer transition-colors mb-5 overflow-hidden">
        {photo ? (
          <img src={URL.createObjectURL(photo)} className="h-full w-full object-cover" alt="" />
        ) : (
          <p className="text-text-sub text-sm">Rasm yuklash uchun bosing</p>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(e.target.files[0] || null)} />
      </label>

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
