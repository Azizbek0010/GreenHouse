import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImageOff } from 'lucide-react'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'
import { Badge, Spinner, ErrorMsg } from '../../components/ui'

function money(n) { return (n || 0).toLocaleString('ru-RU') }

function SafeImg({ src, className }) {
  const [err, setErr] = useState(false)
  const fullSrc = src ? (src.startsWith('http') ? src : `${API_URL}${src}`) : null
  if (!fullSrc || err) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-2 bg-cbg rounded-2xl`}>
        <ImageOff size={32} className="text-cgray" />
        <span className="text-sm text-cgray">Rasm yo'q</span>
      </div>
    )
  }
  return <img src={fullSrc} className={className} alt="" onError={() => setErr(true)} />
}

export default function SotuvDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sv, setSv]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get(`/api/sotuv/${id}`)
      .then(setSv)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline">
        <ArrowLeft size={16} /> Ortga
      </button>

      {loading ? <Spinner /> : (
        <>
          <ErrorMsg msg={error} onClose={() => setError('')} />

          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-ctext tracking-tight">
              {sv?.flowerType} {sv?.razmer}sm
            </h1>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              sv?.holat === 'nuqsonli' ? 'bg-orange-bg text-corange' : 'bg-green-bg text-cgreen'
            }`}>
              {sv?.holat === 'nuqsonli' ? 'Nuqsonli' : 'Normal'}
            </span>
          </div>

          {sv && (
            <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
              {[
                { label: 'Kassa',      value: sv.kassa?.name || '—' },
                { label: 'Soni',       value: `${sv.qty} ta` },
                { label: 'Narx (1 ta)', value: `${money(sv.pricePerUnit)} so'm` },
                { label: 'Jami',       value: `${money(sv.totalPrice)} so'm` },
                { label: 'Sana',       value: new Date(sv.createdAt).toLocaleString('ru-RU') },
              ].map(({ label, value }, i) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
                  <span className="text-sm text-text-sub">{label}</span>
                  <span className="text-sm font-semibold text-ctext">{value}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Rasm</p>
          <SafeImg src={sv?.photo} className="w-full object-cover rounded-2xl" style={{ maxHeight: '70vh' }} />
        </>
      )}
    </div>
  )
}
