import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Check, Plus, Trash2, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

const TYPES = ['Roza', 'Lola', 'Xrizantema', 'Gerbera', 'Gladiolus', 'Pion', 'Boshqa']
const SIZES = [50, 60, 70, 80, 90, 100, 110]

// ── Kassa tanlash modal ───────────────────────────────────────────
function KassaSelect({ kassalar, value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = kassalar.find(k => k._id === value)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <span className={`text-base ${selected ? 'text-ctext font-semibold' : 'text-text-sub'}`}>
          {selected ? selected.name : 'Kassani tanlang'}
        </span>
        <ChevronDown size={16} className="text-text-sub shrink-0" />
      </button>
      <BottomModal open={open} onClose={() => setOpen(false)} title="Qaysi kassaga?">
        {kassalar.map(k => (
          <button
            key={k._id}
            onClick={() => { onChange(k._id); setOpen(false) }}
            className={`flex items-center justify-between w-full px-5 py-4 text-base font-medium transition-colors ${
              k._id === value ? 'text-primary bg-blue-bg' : 'text-ctext hover:bg-cbg'
            }`}
          >
            {k.name}
            {k._id === value && <Check size={16} />}
          </button>
        ))}
      </BottomModal>
    </>
  )
}

// ── Gul turi tanlash modal ────────────────────────────────────────
function TypeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <span className={`text-base ${value ? 'text-ctext font-semibold' : 'text-text-sub'}`}>
          {value || 'Gul turini tanlang'}
        </span>
        <ChevronDown size={16} className="text-text-sub shrink-0" />
      </button>
      <BottomModal open={open} onClose={() => setOpen(false)} title="Gul turini tanlang">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => { onChange(t); setOpen(false) }}
            className={`flex items-center justify-between w-full px-5 py-4 text-base font-medium transition-colors ${
              t === value ? 'text-primary bg-blue-bg' : 'text-ctext hover:bg-cbg'
            }`}
          >
            {t}
            {t === value && <Check size={16} />}
          </button>
        ))}
      </BottomModal>
    </>
  )
}

// ── Bir gul kartasi ───────────────────────────────────────────────
function FlowerCard({ flower, onChange, onRemove, canRemove }) {
  const toggleSize = (sm) => {
    const exists = flower.sizes.find(s => s.sm === sm)
    onChange({
      ...flower,
      sizes: exists
        ? flower.sizes.filter(s => s.sm !== sm)
        : [...flower.sizes, { sm, qty: 1 }],
    })
  }

  const setQty = (sm, val) => {
    onChange({
      ...flower,
      sizes: flower.sizes.map(s => s.sm === sm ? { ...s, qty: val.replace(/\D/g, '') } : s),
    })
  }

  const totalQty = flower.sizes.reduce((s, x) => s + (parseInt(x.qty) || 0), 0)

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      {/* Gul turi + o'chirish */}
      <div className="flex items-center border-b border-separator">
        <div className="flex-1">
          <TypeSelect value={flower.type} onChange={v => onChange({ ...flower, type: v })} />
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

      {/* O'lchamlar */}
      <div className="px-4 py-3 border-b border-separator">
        <p className="text-xs text-text-sub mb-2 font-medium">O'lcham (sm) — bir nechta tanlang</p>
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

      {/* Tanlangan o'lchamlar uchun soni */}
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
              <span className="text-xs text-primary">{flower.sizes.length} o'lcham</span>
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

export default function PartiyaYuborish() {
  const navigate  = useNavigate()
  const [kassalar, setKassalar] = useState([])
  const [kassaId, setKassaId]   = useState(null)
  const [flowers, setFlowers]   = useState([newFlower()])
  const [photo, setPhoto]       = useState(null)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.get('/api/auth/kassalar')
      .then(setKassalar)
      .catch(e => setError(e.message))
  }, [])

  const updateFlower = (id, updated) => setFlowers(prev => prev.map(f => f.id === id ? updated : f))
  const removeFlower = (id)          => setFlowers(prev => prev.filter(f => f.id !== id))
  const addFlower    = ()            => setFlowers(prev => [...prev, newFlower()])

  const totalQty = flowers.reduce((s, f) => s + f.sizes.reduce((ss, x) => ss + (parseInt(x.qty) || 0), 0), 0)

  const onSend = async () => {
    if (!kassaId)                         return setError('Kassani tanlang')
    if (flowers.some(f => !f.type))       return setError('Har bir gulning turini tanlang')
    if (flowers.some(f => f.sizes.length === 0)) return setError("Har bir gulda kamida bitta o'lcham bo'lishi kerak")
    if (flowers.some(f => f.sizes.some(s => !(parseInt(s.qty) > 0)))) return setError("Sonlarni to'liq kiriting")
    if (!photo)                           return setError('Rasm majburiy')

    const payload = flowers.map(({ type, sizes }) => ({
      type,
      sizes: sizes.map(s => ({ sm: s.sm, qty: parseInt(s.qty) })),
    }))

    setError(''); setSending(true)
    try {
      const form = new FormData()
      form.append('kassaId', kassaId)
      form.append('flowers', JSON.stringify(payload))
      form.append('photo', photo)
      await api.postForm('/api/partiya', form)
      navigate('/teplitsa')
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline">
        <ArrowLeft size={16} /> Ortga
      </button>
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-1">Partiya yuborish</h1>
      <p className="text-sm text-text-sub mb-5">Qaysi kassaga va qancha gul yuborishni kiriting</p>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Kassa tanlash */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Kassa</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
        {kassalar.length === 0 ? (
          <p className="px-4 py-4 text-sm text-text-sub">Yuklanmoqda...</p>
        ) : (
          <KassaSelect kassalar={kassalar} value={kassaId} onChange={setKassaId} />
        )}
      </div>

      {/* Gullar */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Yuborilayotgan gullar</p>

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
        <div className="bg-blue-bg border border-primary/20 rounded-2xl p-4 flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-primary font-semibold">Jami yuboriladi</p>
            <p className="text-xs text-primary/70 mt-0.5">{flowers.length} tur gul</p>
          </div>
          <p className="text-2xl font-bold text-primary">{totalQty} <span className="text-base font-medium">ta</span></p>
        </div>
      )}

      {/* Rasm */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Rasm (majburiy)</p>
      <label className={`flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-colors mb-5 overflow-hidden ${
        photo ? 'border-primary' : 'border-cborder bg-ccard hover:border-primary'
      }`}>
        {photo ? (
          <img src={URL.createObjectURL(photo)} className="h-full w-full object-cover" alt="" />
        ) : (
          <div className="text-center px-4">
            <p className="text-text-sub text-sm">Yuborilayotgan gul rasmini yuklang</p>
            <p className="text-xs text-cgray mt-1">JPG, PNG — majburiy</p>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(e.target.files[0] || null)} />
      </label>

      <button
        onClick={onSend}
        disabled={sending}
        className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {sending
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Package size={18} /> Partiyani yuborish</>
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
