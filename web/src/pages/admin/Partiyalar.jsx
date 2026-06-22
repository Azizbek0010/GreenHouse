import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge, Spinner, EmptyState, ErrorMsg } from '../../components/ui'

const FILTERS = [
  { key: 'hammasi',       label: 'Hammasi' },
  { key: 'yolda',         label: "Yo'lda" },
  { key: 'qabul_qilindi', label: 'Qabul' },
  { key: 'farq_bor',      label: 'Farq' },
]

function summarize(flowers = []) {
  return flowers.map(f => `${f.type} ${f.sizes.reduce((s, x) => s + x.qty, 0)}ta`).join(', ')
}

function fmt(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPartiyalar() {
  const navigate = useNavigate()
  const [filter, setFilter]   = useState('hammasi')
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setList(await api.get('/api/partiya')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const shown = filter === 'hammasi' ? list : list.filter(p => p.status === filter)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Partiyalar</h1>
        <button onClick={load} className="p-2 rounded-xl hover:bg-cbg text-text-sub hover:text-ctext transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(f => {
          const count  = f.key === 'hammasi' ? list.length : list.filter(p => p.status === f.key).length
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 h-9 px-4 rounded-full text-sm font-semibold transition-all border ${
                active
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-ccard text-text-sub border-cborder hover:border-primary hover:text-ctext'
              }`}
            >
              {f.label}
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                active ? 'bg-white/20 text-white' : 'bg-cbg text-text-sub'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState text="Partiya yo'q" />
      ) : (
        <div className="bg-ccard rounded-2xl border border-cborder overflow-hidden">
          {shown.map((p, i) => (
            <button
              key={p._id}
              onClick={() => navigate(`/admin/farq/${p._id}`)}
              className={`w-full flex items-center gap-3 p-4 text-left hover:bg-cbg transition-colors ${i > 0 ? 'border-t border-separator' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ctext">{p.batchId}</p>
                <p className="text-xs text-text-sub mt-0.5">{summarize(p.sent) || '—'}</p>
                <p className="text-xs text-[#9aa0a8] mt-0.5">
                  {p.teplitsa?.name || 'Teplitsa'} → {p.kassa?.name || 'Kassa'} · {fmt(p.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge status={p.status} />
                <ChevronRight size={16} className="text-cborder" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
