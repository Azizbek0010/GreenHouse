import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge, Spinner, EmptyState, ErrorMsg, SafeImg } from '../../components/ui'

const FILTERS = [
  { key: 'pending',  label: 'Kutilmoqda', color: 'text-corange' },
  { key: 'approved', label: 'Tasdiqlangan', color: 'text-cgreen' },
  { key: 'rejected', label: 'Rad etilgan', color: 'text-cred' },
]
const SABAB_LABEL = {
  "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa',
}
function money(n) { return (n || 0).toLocaleString('ru-RU') }

export default function AdminAtxod() {
  const [filter, setFilter]   = useState('pending')
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId]   = useState(null)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setList(await api.get('/api/atxod')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const review = async (id, status) => {
    if (status === 'rejected' && !window.confirm("Bu atxodni rad etasizmi?")) return
    setBusyId(id)
    try {
      await api.patch(`/api/atxod/${id}/review`, { status })
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusyId(null) }
  }

  const shown        = list.filter(a => a.status === filter)
  const pendingCount = list.filter(a => a.status === 'pending').length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Atxod tekshirish</h1>
        <button
          onClick={load}
          className="p-2 rounded-xl hover:bg-cbg text-text-sub hover:text-ctext transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* ── Filter chips ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => {
          const c      = list.filter(a => a.status === f.key).length
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
                active
                  ? 'bg-white/20 text-white'
                  : 'bg-cbg text-text-sub'
              }`}>
                {c}
              </span>
            </button>
          )
        })}
      </div>

      {filter === 'pending' && pendingCount > 0 && (
        <p className="text-sm text-corange font-medium mb-3">
          {pendingCount} ta atxod tekshiruvni kutmoqda
        </p>
      )}

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState text="Bu bo'limda atxod yo'q" />
      ) : (
        <div className="space-y-3">
          {shown.map(a => (
            <div key={a._id} className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
              {/* Photo */}
              <SafeImg src={a.photo} className="w-full h-48" />

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-semibold text-ctext">
                    {a.flowerType} {a.razmer}sm
                  </p>
                  <Badge status={a.status} />
                </div>
                <p className="text-sm text-text-sub">
                  {a.qty} ta · {SABAB_LABEL[a.sabab] || a.sabab} · {a.kassa?.name || 'Kassa'}
                </p>
                {a.qiymat > 0 && (
                  <p className="text-sm text-text-sub mt-0.5">
                    Qiymati: {money(a.qiymat * a.qty)} s
                  </p>
                )}

                {a.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => review(a._id, 'rejected')}
                      disabled={busyId === a._id}
                      className="flex-1 h-11 rounded-xl border border-cred text-cred text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-bg transition-colors disabled:opacity-60"
                    >
                      {busyId === a._id
                        ? <span className="w-4 h-4 border-2 border-cred border-t-transparent rounded-full animate-spin" />
                        : <><X size={16} />Rad etish</>
                      }
                    </button>
                    <button
                      onClick={() => review(a._id, 'approved')}
                      disabled={busyId === a._id}
                      className="flex-1 h-11 rounded-xl bg-cgreen text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {busyId === a._id
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Check size={16} />Tasdiqlash</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
