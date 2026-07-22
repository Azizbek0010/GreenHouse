// Qabul — kassa faqat nechta gul kelganini kiritadi.
// Gul turi va razmer qabulda so'ralmaydi: teplitsa ham faqat umumiy sonni yuboradi,
// farq shu ikki son orasidagi ayirma.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'

function num(s) { return parseInt(String(s).replace(/\D/g, '')) || 0 }

export default function Qabul() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get('id')

  const [soni, setSoni]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const onConfirm = async () => {
    if (!(num(soni) > 0)) return setError('Kelgan gullar sonini kiriting')

    setError(''); setSaving(true)
    try {
      await api.post(`/api/partiya/${id}/receive`, { soni: num(soni) })
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
      <p className="text-sm text-text-sub mb-5">Kelgan gullarni o'zingiz saning va sonini kiriting</p>

      <div className="flex items-start gap-3 bg-blue-bg border-l-4 border-primary rounded-2xl p-4 mb-5">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Mustaqil hisoblang</p>
          <p className="text-xs text-primary/70 mt-0.5">Teplitsa ma'lumotlari sizga ko'rinmaydi — o'zingiz sanab kiriting.</p>
        </div>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Nechta gul keldi?</p>
      <div className="bg-ccard border border-cborder rounded-2xl flex items-center px-4 py-4 mb-5">
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          value={soni}
          onChange={e => setSoni(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="flex-1 bg-transparent text-ctext text-3xl font-bold outline-none"
        />
        <span className="text-text-sub text-lg font-medium ml-2">ta</span>
      </div>

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
