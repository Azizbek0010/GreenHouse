import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Check, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

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

// ── Main ──────────────────────────────────────────────────────────
export default function PartiyaYuborish() {
  const navigate  = useNavigate()
  const [kassalar, setKassalar] = useState([])
  const [kassaId, setKassaId]   = useState(null)
  const [soni, setSoni]         = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.get('/api/auth/kassalar')
      .then(setKassalar)
      .catch(e => setError(e.message))
  }, [])

  const soniNum = parseInt(soni) || 0

  const onSend = async () => {
    if (!kassaId)        return setError('Kassani tanlang')
    if (!(soniNum > 0))  return setError('Gullar sonini kiriting')

    setError(''); setSending(true)
    try {
      await api.post('/api/partiya', { kassaId, soni: soniNum })
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
      <p className="text-sm text-text-sub mb-5">Qaysi kassaga va nechta gul yuborishni kiriting</p>

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

      {/* Gullar soni */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Nechta gul?</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
        <div className="flex items-center px-4 py-4">
          <input
            type="text"
            inputMode="numeric"
            value={soni}
            onChange={e => setSoni(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-transparent text-ctext text-2xl font-bold outline-none placeholder:text-text-sub placeholder:font-normal placeholder:text-base"
            placeholder="Masalan: 1000"
            autoFocus
          />
          <span className="text-text-sub ml-2 text-base font-medium">ta</span>
        </div>
      </div>

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
