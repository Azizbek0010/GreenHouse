import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flower2, AlertTriangle, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { StatCard, Badge, Spinner, EmptyState, ErrorMsg } from '../../components/ui'
import { groupByDate } from '../../lib/date'
import SavdoCard from '../../components/SavdoCard'

const PERIODS = [
  { key: 'kunlik',   label: 'Kunlik' },
  { key: 'haftalik', label: 'Haftalik' },
  { key: 'oylik',    label: 'Oylik' },
  { key: 'jami',     label: 'Jami' },
]

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function summarize(p) {
  // YANGI rejim: umumiy son. ESKI rejim: tur+razmer.
  if (p.sentTotal != null) return `${p.sentTotal} ta`
  return (p.sent || []).map(f => `${f.type} ${f.sizes.reduce((s, x) => s + x.qty, 0)}ta`).join(', ')
}
function formatBatchId(id = '') { return id.replace(/^BATCH-/, 'PARTIYA-') }
function farqLine(f) {
  const d = f.diff > 0 ? `+${f.diff}` : `${f.diff}`
  return `${f.type} ${f.sm}sm: kutilgan ${f.sent} ta, keldi ${f.received} ta (${d})`
}

function PartiyaCard({ p, onClick }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <button onClick={onClick} className="text-base font-semibold text-ctext hover:text-primary transition-colors text-left">
            {formatBatchId(p.batchId)}
          </button>
          <Badge status={p.status} />
        </div>
        <p className="text-sm text-text-sub">{p.teplitsa?.name || 'Teplitsa'} → {p.kassa?.name || 'Kassa'}</p>
        <p className="text-xs text-text-sub mt-0.5">{summarize(p) || '—'}</p>
        <p className="text-xs text-text-sub/60 mt-0.5">{new Date(p.createdAt).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit' })} · {new Date(p.createdAt).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}</p>

        {p.farq?.length > 0 && (
          <button onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-cred font-semibold mt-3 hover:underline">
            {expanded ? <><ChevronUp size={12}/> Yopish</> : <><ChevronDown size={12}/> Farqlar ({p.farq.length})</>}
          </button>
        )}
      </div>
      {expanded && p.farq?.length > 0 && (
        <div className="border-t border-separator px-4 py-3 space-y-1.5">
          {p.farq.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-red-bg/40 border border-cred/20 rounded-xl px-3 py-2">
              <span className="text-xs text-ctext font-medium">{f.type} {f.sm}sm</span>
              <span className="text-xs text-cred font-semibold">
                {f.sent} → {f.received} ({f.diff > 0 ? '+' : ''}{f.diff})
              </span>
            </div>
          ))}
        </div>
      )}
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

          {/* Savdo taqsimoti — tanlangan davr bo'yicha naqt / karta / qarz */}
          <SavdoCard
            savdo={stats?.savdo}
            tushum={stats?.tushum}
            title={`Umumiy savdo · ${PERIODS.find(p => p.key === period)?.label ?? ''}`}
            subtitle={`${stats?.savdo?.gullar || 0} ta gul sotilgan (qarzga berilgani bilan)`}
          />

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
                <p className="text-sm font-bold text-ctext">Farq aniqlandi — {formatBatchId(farqBatch.batchId)}</p>
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
          {partiyalar.length === 0 ? (
            <EmptyState text="Hozircha partiya yo'q" />
          ) : (
            <div>
              {groupByDate(partiyalar.slice(0, 8)).map((group, gi) => (
                <div key={group.label}>
                  <div className={`${gi === 0 ? 'mb-3' : 'mt-6 mb-3'}`}>
                    <p className="text-xl font-bold text-ctext">{group.label}</p>
                  </div>
                  <div className="space-y-3">
                    {group.items.map(p => (
                      <PartiyaCard key={p._id} p={p} onClick={() => navigate(`/admin/farq/${p._id}`)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
