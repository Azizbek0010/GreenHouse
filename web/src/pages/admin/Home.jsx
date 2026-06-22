import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Flower2, AlertTriangle, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'
import { StatCard, Badge, Spinner, EmptyState, ErrorMsg } from '../../components/ui'

const PERIODS = [
  { key: 'kunlik',   label: 'Kunlik' },
  { key: 'haftalik', label: 'Haftalik' },
  { key: 'oylik',    label: 'Oylik' },
  { key: 'jami',     label: 'Jami' },
]

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function summarize(flowers = []) {
  return flowers.map(f => `${f.type} ${f.sizes.reduce((s, x) => s + x.qty, 0)}ta`).join(', ')
}
function farqLine(f) {
  const d = f.diff > 0 ? `+${f.diff}` : `${f.diff}`
  return `${f.type} ${f.sm}sm: kutilgan ${f.sent} ta, keldi ${f.received} ta (${d})`
}

function HomeAvatar({ user }) {
  const [err, setErr] = useState(false)
  if (user?.avatar && !err) {
    return (
      <img
        src={`${API_URL}${user.avatar}`}
        className="w-10 h-10 rounded-full object-cover shrink-0"
        alt=""
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
      {(user?.name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

export default function AdminHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod]       = useState('kunlik')
  const [stats, setStats]         = useState(null)
  const [partiyalar, setPartiyalar] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [st, ps] = await Promise.all([
        api.get(`/api/stats/admin?period=${period}`),
        api.get('/api/partiya'),
      ])
      setStats(st)
      setPartiyalar(ps)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const farqBatch = partiyalar.find(p => p.status === 'farq_bor' && p.farq?.length)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header — desktop only (mobile uses fixed Layout header) */}
      <div className="hidden md:flex items-center gap-3 mb-6">
        <HomeAvatar user={user} />
        <div>
          <p className="font-semibold text-ctext">{user?.name}</p>
          <p className="text-xs text-text-sub">Administrator</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-[#e9ebee] dark:bg-gray-800 rounded-xl p-1 mb-5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
              period === p.key
                ? 'bg-primary text-white'
                : 'text-text-sub hover:text-ctext'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : (
        <>
          {/* Hero — Daromad */}
          <div className="bg-primary rounded-2xl p-5 mb-4 text-white">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Daromad</p>
            <p className="text-4xl font-bold tracking-tight">
              {money(stats?.daromad)} <span className="text-lg font-medium text-white/70">so'm</span>
            </p>
          </div>

          {/* Stat cards */}
          <div className="flex gap-3 mb-4">
            <StatCard
              label="Sotilgan gullar"
              value={String(stats?.sotildi ?? 0)}
              unit="ta"
              icon={<Flower2 size={17} />}
              bg="bg-blue-bg"
              textColor="text-primary"
            />
            <StatCard
              label="Farqlar"
              value={String(stats?.farq?.count ?? 0)}
              unit="tekshirilmagan"
              icon={<AlertTriangle size={17} />}
              bg="bg-red-bg"
              textColor="text-cred"
            />
          </div>

          {/* Farq banner */}
          {farqBatch && (
            <button
              onClick={() => navigate(`/admin/farq/${farqBatch._id}`)}
              className="w-full flex items-center gap-3 bg-ccard border border-cborder border-l-4 border-l-corange rounded-2xl p-4 mb-4 text-left hover:bg-orange-bg transition-colors"
            >
              <AlertTriangle size={20} className="text-corange shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ctext">Farq aniqlandi — {farqBatch.batchId}</p>
                <p className="text-xs text-text-sub mt-0.5 truncate">{farqLine(farqBatch.farq[0])}</p>
              </div>
              <ChevronRight size={18} className="text-corange shrink-0" />
            </button>
          )}

          {/* Atxod / Loss */}
          <div className="bg-ccard border border-cborder rounded-2xl p-4 mb-5">
            <div className="flex items-center">
              <div className="flex-1 text-center">
                <p className="text-xs font-semibold text-text-sub uppercase tracking-wide">Atxod (chiqindi)</p>
                <p className="text-xl font-bold text-corange mt-1">{stats?.atxod?.qty ?? 0} ta</p>
              </div>
              <div className="w-px h-10 bg-separator" />
              <div className="flex-1 text-center">
                <p className="text-xs font-semibold text-text-sub uppercase tracking-wide">Yo'qotish</p>
                <p className="text-xl font-bold text-cred mt-1">{money(stats?.yoqotish)} s</p>
              </div>
            </div>
          </div>

          {/* Last partiyalar */}
          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Oxirgi partiyalar</p>
          {partiyalar.length === 0 ? (
            <EmptyState text="Hozircha partiya yo'q" />
          ) : (
            <div className="bg-ccard rounded-2xl border border-cborder overflow-hidden">
              {partiyalar.slice(0, 5).map((p, i) => (
                <button
                  key={p._id}
                  onClick={() => navigate(`/admin/farq/${p._id}`)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-cbg transition-colors ${i > 0 ? 'border-t border-separator' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ctext">{p.batchId}</p>
                    <p className="text-xs text-text-sub mt-0.5">{summarize(p.sent) || '—'}</p>
                  </div>
                  <Badge status={p.status} />
                  <ChevronRight size={16} className="text-cborder" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
