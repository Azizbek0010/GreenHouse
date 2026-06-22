import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Info, Plus, Trash2, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

const TYPES = ['Roza', 'Lola', 'Xrizantema', 'Gerbera', 'Gladiolus', 'Pion', 'Boshqa']
const SIZES = [50, 60, 70, 80, 90, 100, 110]

// ── Bottom-sheet modal picker ─────────────────────────────────────
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

// ── One flower card ───────────────────────────────────────────────
function FlowerCard({ flower, onChange, onRemove, canRemove }) {
  const toggleSize = (sm) => {
    const exists = flower.sizes.find(s => s.sm === sm)
    const newSizes = exists
      ? flower.sizes.filter(s => s.sm !== sm)
      : [...flower.sizes, { sm, qty: 1 }]
    onChange({ ...flower, sizes: newSizes })
  }

  const setQty = (sm, val) => {
    const q = val.replace(/\D/g, '')
    onChange({
      ...flower,
      sizes: flower.sizes.map(s => s.sm === sm ? { ...s, qty: q } : s),
    })
  }

  const totalQty = flower.sizes.reduce((s, x) => s + (parseInt(x.qty) || 0), 0)

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      {/* Gul turi + remove */}
      <div className="flex items-center border-b border-separator">
        <div className="flex-1">
          <SelectModal
            options={TYPES}
            value={flower.type}
            onChange={v => onChange({ ...flower, type: v })}
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

      {/* Razmerlar */}
      <div className="px-4 py-3 border-b border-separator">
        <p className="text-xs text-text-sub mb-2 font-medium">O'lcham (sm) — bir nechta tanlash mumkin</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map(sm => {
            const active = !!flower.sizes.find(s => s.sm === sm)
            return (
              <button
                key={sm}
                onClick={() => toggleSize(sm)}
                className={`px-3 h-8 rounded-lg text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-cbg text-ctext border-cborder hover:border-primary'
                }`}
              >
                {sm}sm
              </button>
            )
          })}
        </div>
      </div>

      {/* Tanlangan razmerlar uchun soni */}
      {flower.sizes.length > 0 && (
        <div className="divide-y divide-separator">
          {flower.sizes.map(s => (
            <div key={s.sm} className="flex items-center px-4 py-3">
              <span className="flex-1 text-sm text-ctext font-medium">{s.sm} sm</span>
              <input
                type="text"
                inputMode="numeric"
                value={s.qty}
                onChange={e => setQty(s.sm, e.target.value)}
                className="w-20 text-right bg-transparent text-ctext text-base font-semibold outline-none"
                placeholder="0"
              />
              <span className="text-text-sub ml-1.5 text-sm">ta</span>
            </div>
          ))}
          {totalQty > 0 && (
            <div className="px-4 py-2.5 bg-blue-bg flex items-center justify-between">
              <span className="text-xs text-primary">{flower.sizes.length} razmer</span>
              <span className="text-sm font-bold text-primary">Jami: {totalQty} ta</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
const newFlower = () => ({ id: Date.now() + Math.random(), type: '', sizes: [] })

export default function Qabul() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get('id')

  const [flowers, setFlowers] = useState([newFlower()])
  const [photo, setPhoto]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const updateFlower = (fid, updated) => setFlowers(prev => prev.map(f => f.id === fid ? updated : f))
  const removeFlower = (fid)          => setFlowers(prev => prev.filter(f => f.id !== fid))
  const addFlower    = ()             => setFlowers(prev => [...prev, newFlower()])

  const totalQty = flowers.reduce((s, f) => s + f.sizes.reduce((ss, x) => ss + (parseInt(x.qty) || 0), 0), 0)

  const onConfirm = async () => {
    if (flowers.some(f => !f.type))          return setError('Har bir gulning turini tanlang')
    if (flowers.some(f => f.sizes.length === 0)) return setError("Har bir gulda kamida bitta o'lcham bo'lishi kerak")
    if (flowers.some(f => f.sizes.some(s => !(parseInt(s.qty) > 0)))) return setError('Sonlarni to\'liq kiriting')
    if (!photo)                              return setError('Rasm majburiy')

    // API uchun id'ni olib tashlaymiz
    const payload = flowers.map(({ type, sizes }) => ({
      type,
      sizes: sizes.map(s => ({ sm: s.sm, qty: parseInt(s.qty) })),
    }))

    setError(''); setSaving(true)
    try {
      const form = new FormData()
      form.append('photo', photo)
      form.append('flowers', JSON.stringify(payload))
      await api.postForm(`/api/partiya/${id}/receive`, form)
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
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-1">Qabul qilish</h1>
      <p className="text-sm text-text-sub mb-5">Kelgan gullarni o'zingiz saning va kiriting</p>

      <div className="flex items-start gap-3 bg-blue-bg border-l-4 border-primary rounded-2xl p-4 mb-5">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Mustaqil hisoblang</p>
          <p className="text-xs text-primary/70 mt-0.5">Teplitsa ma'lumotlari sizga ko'rinmaydi — o'zingiz sanab kiriting.</p>
        </div>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Gullar */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Kelgan gullar</p>

      {flowers.map(f => (
        <FlowerCard
          key={f.id}
          flower={f}
          onChange={updated => updateFlower(f.id, updated)}
          onRemove={() => removeFlower(f.id)}
          canRemove={flowers.length > 1}
        />
      ))}

      <button
        onClick={addFlower}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-cborder text-text-sub text-sm font-semibold hover:border-primary hover:text-primary transition-colors mb-5"
      >
        <Plus size={16} />
        Gul qo'shish
      </button>

      {/* Total */}
      {totalQty > 0 && (
        <div className="bg-blue-bg border border-primary/20 rounded-2xl p-4 flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-primary font-semibold">Jami qabul</p>
            <p className="text-xs text-primary/70 mt-0.5">{flowers.length} tur gul</p>
          </div>
          <p className="text-2xl font-bold text-primary">{totalQty} <span className="text-base font-medium">ta</span></p>
        </div>
      )}

      {/* Photo */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Umumiy rasm (majburiy)</p>
      <label className={`flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-colors mb-5 overflow-hidden ${
        photo ? 'border-primary' : 'border-cborder bg-ccard hover:border-primary'
      }`}>
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
        onClick={onConfirm}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {saving
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Check size={18} /> Qabulni tasdiqlash</>
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
