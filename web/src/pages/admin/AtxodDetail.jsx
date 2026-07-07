import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImageOff, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'
import { Spinner, ErrorMsg } from '../../components/ui'

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

function StatusBadge({ status }) {
  if (status === 'approved') return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-cgreen bg-green-bg px-3 py-1 rounded-full">
      <CheckCircle size={14} /> Tasdiqlandi
    </span>
  )
  if (status === 'rejected') return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-cred bg-red-bg px-3 py-1 rounded-full">
      <XCircle size={14} /> Rad etildi
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-corange bg-orange-bg px-3 py-1 rounded-full">
      <Clock size={14} /> Kutilmoqda
    </span>
  )
}

export default function AtxodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ax, setAx]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get(`/api/atxod/${id}`)
      .then(setAx)
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
              {ax?.flowerType} {ax?.razmer}sm
            </h1>
            <StatusBadge status={ax?.status} />
          </div>

          {ax && (
            <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
              {[
                { label: 'Kassa',   value: ax.kassa?.name || '—' },
                { label: 'Soni',    value: `${ax.qty} ta` },
                { label: 'Qiymat',  value: `${money(ax.qiymat)} so'm` },
                { label: 'Sabab',   value: ax.sabab || '—' },
                { label: 'Sana',    value: new Date(ax.createdAt).toLocaleString('ru-RU') },
                ...(ax.adminNote ? [{ label: 'Admin izohi', value: ax.adminNote }] : []),
              ].map(({ label, value }, i) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
                  <span className="text-sm text-text-sub">{label}</span>
                  <span className="text-sm font-semibold text-ctext text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Rasm</p>
          <SafeImg src={ax?.photo} className="w-full object-cover rounded-2xl" />
        </>
      )}
    </div>
  )
}
