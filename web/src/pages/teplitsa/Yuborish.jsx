import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, Flower2, Store, Send } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

const QUICK = [250, 500, 1000, 2000]

// ── Kassa tanlash modal ───────────────────────────────────────────
function KassaSelect({ kassalar, value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = kassalar.find(k => k._id === value)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full px-4 py-4 text-left"
      >
        <span className="w-10 h-10 rounded-xl bg-blue-bg flex items-center justify-center shrink-0">
          <Store size={18} className="text-primary" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-semibold text-text-sub uppercase tracking-wider">Kassa</span>
          <span className={`block text-base truncate ${selected ? 'text-ctext font-semibold' : 'text-text-sub'}`}>
            {selected ? selected.name : 'Kassani tanlang'}
          </span>
        </span>
        <ChevronDown size={18} className="text-text-sub shrink-0" />
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

  const soniNum  = parseInt(soni) || 0
  const selected = kassalar.find(k => k._id === kassaId)
  const canSend  = kassaId && soniNum > 0

  const onSend = async () => {
    if (!kassaId)       return setError('Kassani tanlang')
    if (!(soniNum > 0)) return setError('Gullar sonini kiriting')

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
    <div className="min-h-full flex flex-col p-4 md:p-6 max-w-md mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary text-sm font-medium mb-6 hover:underline self-start"
      >
        <ArrowLeft size={16} /> Ortga
      </button>

      {/* Sarlavha */}
      <div className="flex flex-col items-center text-center mb-7">
        <span className="w-14 h-14 rounded-2xl bg-blue-bg flex items-center justify-center mb-3">
          <Flower2 size={26} className="text-primary" />
        </span>
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Partiya yuborish</h1>
        <p className="text-sm text-text-sub mt-1 max-w-xs">
          Umumiy sonini kiriting — kassa gullarni turlarga ajratib qabul qiladi
        </p>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Kassa */}
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-4">
        {kassalar.length === 0
          ? <p className="px-4 py-5 text-sm text-text-sub">Yuklanmoqda...</p>
          : <KassaSelect kassalar={kassalar} value={kassaId} onChange={setKassaId} />
        }
      </div>

      {/* Gullar soni — asosiy blok */}
      <div className="bg-ccard border border-cborder rounded-2xl px-5 pt-6 pb-5 mb-4">
        <p className="text-[11px] font-semibold text-text-sub uppercase tracking-wider text-center mb-2">
          Nechta gul yuborilmoqda?
        </p>
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <input
            type="text"
            inputMode="numeric"
            value={soni}
            onChange={e => setSoni(e.target.value.replace(/\D/g, '').slice(0, 7))}
            className="max-w-full bg-transparent text-ctext text-5xl font-extrabold text-center tabular-nums outline-none placeholder:text-text-sub/40"
            style={{ width: `${Math.max(soni.length || 1, 1) + 0.5}ch` }}
            placeholder="0"
            autoFocus
          />
          <span className="text-text-sub text-xl font-semibold shrink-0">ta</span>
        </div>

        {/* Tez tanlash */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {QUICK.map(n => {
            const active = soniNum === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setSoni(String(n))}
                className={`px-3.5 h-9 rounded-xl text-sm font-semibold border transition-colors ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-cbg text-ctext border-cborder hover:border-primary'
                }`}
              >
                {n.toLocaleString()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Jonli xulosa */}
      {canSend && (
        <div className="flex items-center gap-3 bg-blue-bg border border-primary/20 rounded-2xl px-4 py-3 mb-4">
          <Flower2 size={18} className="text-primary shrink-0" />
          <p className="text-sm text-primary">
            <span className="font-bold">{soniNum.toLocaleString()} ta</span> gul
            <span className="text-primary/60"> → </span>
            <span className="font-semibold">{selected?.name}</span>
          </p>
        </div>
      )}

      <div className="flex-1" />

      {/* Amallar */}
      <button
        onClick={onSend}
        disabled={sending || !canSend}
        className="w-full py-4 rounded-2xl bg-primary text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
      >
        {sending
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Send size={18} /> Partiyani yuborish</>
        }
      </button>
      <button
        onClick={() => navigate(-1)}
        className="w-full h-11 rounded-2xl text-text-sub text-sm font-medium hover:bg-cbg transition-colors"
      >
        Bekor qilish
      </button>
    </div>
  )
}
