import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Info, Check, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

const TYPES    = ['Roza', 'Lola', 'Xrizantema', 'Gerbera', 'Gladiolus', 'Pion', 'Boshqa']
const fmtInput = (s) => s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''
const SIZES   = [50, 60, 70, 80, 90, 100, 110]
const SABABLAR = [
  { key: "so'lgan",  label: "So'lgan",  emoji: '🥀' },
  { key: 'nuqsonli', label: 'Nuqsonli', emoji: '⚠️' },
  { key: 'singan',   label: 'Singan',   emoji: '💔' },
  { key: 'boshqa',   label: 'Boshqa',   emoji: '📦' },
]

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

export default function KassaAtxod() {
  const navigate = useNavigate()
  const [type, setType]     = useState('')
  const [razmer, setRazmer] = useState(null)
  const [qty, setQty]       = useState('')
  const [sabab, setSabab]   = useState('')
  const [qiymat, setQiymat] = useState('')
  const [photo, setPhoto]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const onSave = async () => {
    const q = parseInt(qty)
    const qiymatN = parseInt(qiymat.replace(/\s/g, ''))
    if (!type)              return setError('Gul turini tanlang')
    if (!razmer)            return setError('Razmerni tanlang')
    if (!q || q <= 0)       return setError("Soni musbat son bo'lishi kerak")
    if (!qiymatN || qiymatN <= 0) return setError("Qiymatni kiriting (so'm)")
    if (!sabab)             return setError('Sababni tanlang')
    if (!photo)             return setError('Rasm majburiy')

    setError(''); setSaving(true)
    try {
      const form = new FormData()
      form.append('flowerType', type)
      form.append('razmer', String(razmer))
      form.append('qty', String(q))
      form.append('sabab', sabab)
      form.append('qiymat', String(parseInt(qiymat.replace(/\s/g, ''))))
      form.append('photo', photo)
      await api.postForm('/api/atxod', form)
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
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-5">Atxod kiritish</h1>

      <div className="flex items-start gap-3 bg-blue-bg border-l-4 border-primary rounded-2xl p-4 mb-5">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Rasm majburiy</p>
          <p className="text-xs text-primary/70 mt-0.5">Atxod admin tekshiruvidan o'tadi. Gul rasmi shart.</p>
        </div>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Gul turi */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Gul ma'lumotlari</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-4">
        <div className="border-b border-separator">
          <SelectModal
            options={TYPES}
            value={type}
            onChange={setType}
            placeholder="Gul turini tanlang"
          />
        </div>
        <div className="flex items-center px-4 py-3.5 border-b border-separator">
          <span className="flex-1 text-base text-ctext">Soni</span>
          <input
            type="text"
            inputMode="numeric"
            value={qty}
            onChange={e => setQty(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-24 text-right bg-transparent text-ctext text-base font-semibold outline-none"
          />
          <span className="text-text-sub ml-2 text-sm">ta</span>
        </div>
        <div className="flex items-center px-4 py-3.5">
          <span className="flex-1 text-base text-ctext">Qiymat (dona)</span>
          <input
            type="text"
            inputMode="numeric"
            value={fmtInput(qiymat)}
            onChange={e => setQiymat(e.target.value.replace(/[\s\D]/g, ''))}
            placeholder="0"
            className="w-28 text-right bg-transparent text-ctext text-base font-semibold outline-none"
          />
          <span className="text-text-sub ml-2 text-sm">so'm</span>
        </div>
      </div>

      {/* Razmer */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Razmer</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SIZES.map(z => (
          <button
            key={z}
            onClick={() => setRazmer(z)}
            className={`px-4 h-10 rounded-xl text-sm font-medium transition-colors border ${
              razmer === z ? 'bg-primary text-white border-primary' : 'bg-ccard text-ctext border-cborder hover:border-primary'
            }`}
          >
            {z} sm
          </button>
        ))}
      </div>

      {/* Sabab */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Atxod sababi</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-4">
        <SelectModal
          options={SABABLAR}
          value={sabab}
          onChange={setSabab}
          placeholder="Sababni tanlang"
        />
      </div>

      {/* Photo */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Rasm (majburiy)</p>
      <label className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-colors mb-5 overflow-hidden border-cborder bg-ccard hover:border-primary">
        {photo ? (
          <img src={URL.createObjectURL(photo)} className="h-full w-full object-cover" alt="" />
        ) : (
          <div className="text-center">
            <p className="text-text-sub text-sm">Rasm yuklash uchun bosing</p>
            <p className="text-xs text-cgray mt-1">JPG, PNG — majburiy</p>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(e.target.files[0] || null)} />
      </label>

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
