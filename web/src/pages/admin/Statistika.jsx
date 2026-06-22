import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, Flower2, Trash2, Package, BarChart3 } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg } from '../../components/ui'

const PERIODS = [
  { key: 'kunlik',   label: 'Kunlik',   prevLabel: 'Kecha' },
  { key: 'haftalik', label: 'Haftalik', prevLabel: "O'tgan hafta" },
  { key: 'oylik',    label: 'Oylik',    prevLabel: "O'tgan oy" },
  { key: 'jami',     label: 'Jami',     prevLabel: null },
]
const SABAB_LABEL = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }
const SABAB_EMOJI = { "so'lgan": '🥀', nuqsonli: '⚠️', singan: '💔', boshqa: '📦' }

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function shortMoney(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

// ── SVG Bar Chart ──────────────────────────────────────────────────
function BarChart({ data, chartType }) {
  const W = 320, H = 160, PAD_L = 36, PAD_B = 28, PAD_T = 12, PAD_R = 8
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const maxVal = Math.max(1, ...data.map(d => d.daromad))

  // Split into current (last half) vs previous (first half)
  const half     = Math.floor(data.length / 2)
  const prevData = data.slice(0, half)
  const curData  = data.slice(half)
  const allData  = curData // show current period bars

  const MONTHS = ['Yan','Feb','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

  // Format x-axis label based on chart type
  const fmtLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    if (chartType === 'daily')   return `${d.getDate()}/${d.getMonth()+1}`
    if (chartType === 'weekly')  return `${d.getDate()}/${d.getMonth()+1}`
    // monthly / alltime
    return MONTHS[d.getMonth()]
  }

  const barW   = Math.floor((innerW / allData.length) * 0.6)
  const barGap = innerW / allData.length

  // Y grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + innerH * (1 - f),
    label: f === 0 ? '0' : shortMoney(maxVal * f),
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="4 3" />
          <text x={PAD_L - 4} y={g.y + 4} textAnchor="end"
            fontSize="9" fill="currentColor" fillOpacity="0.4">{g.label}</text>
        </g>
      ))}

      {/* Bars */}
      {allData.map((d, i) => {
        const bh   = Math.max(2, (d.daromad / maxVal) * innerH)
        const x    = PAD_L + i * barGap + (barGap - barW) / 2
        const y    = PAD_T + innerH - bh
        // Previous period bar (lighter, behind)
        const prevD = prevData[i]
        const pbh   = prevD ? Math.max(2, (prevD.daromad / maxVal) * innerH) : 0
        const px    = x - barW * 0.35
        return (
          <g key={i}>
            {/* Prev period bar */}
            {prevD && pbh > 0 && (
              <rect x={px} y={PAD_T + innerH - pbh} width={barW * 0.5} height={pbh}
                rx="3" fill="currentColor" fillOpacity="0.12" />
            )}
            {/* Current bar */}
            <rect x={x} y={y} width={barW} height={bh} rx="4"
              fill="#4a7fc1" />
            {/* X label */}
            <text x={x + barW / 2} y={H - 8} textAnchor="middle"
              fontSize="9" fill="currentColor" fillOpacity="0.5">
              {fmtLabel(d.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Trend badge ──────────────────────────────────────────────────────
function Trend({ cur, prev }) {
  if (prev === undefined || prev === null) return null
  const diff = cur - prev
  const pct  = prev === 0 ? (cur > 0 ? 100 : 0) : Math.abs(Math.round((diff / prev) * 100))
  if (diff === 0) return <span className="text-xs text-text-sub">—</span>
  const up = diff > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
      up ? 'bg-green-bg text-cgreen' : 'bg-red-bg text-cred'
    }`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {pct}%
    </span>
  )
}

// ── Metric row ───────────────────────────────────────────────────────
function MetricRow({ label, cur, prev, unit = "so'm", color, divider }) {
  return (
    <>
      {divider && <div className="h-px bg-separator" />}
      <div className="flex items-center justify-between py-3.5 px-4">
        <p className="text-sm text-text-sub">{label}</p>
        <div className="flex items-center gap-2">
          <Trend cur={cur} prev={prev} />
          <p className={`text-sm font-bold ${color || 'text-ctext'}`}>
            {money(cur)} <span className="font-normal text-xs text-text-sub">{unit}</span>
          </p>
        </div>
      </div>
    </>
  )
}

// ── Bar row ──────────────────────────────────────────────────────────
function BarRow({ name, value, displayVal, max, color = 'bg-primary', emoji }) {
  const pct = Math.round((value / Math.max(1, max)) * 100)
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-base leading-none">{emoji}</span>}
          <span className="text-sm font-semibold text-ctext">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ctext">{displayVal}</span>
          <span className="text-xs text-text-sub bg-cbg px-1.5 py-0.5 rounded-md font-medium">{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-cbg overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Section label ────────────────────────────────────────────────────
function SLabel({ icon: Icon, label, iconColor, iconBg, action }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={13} className={iconColor} />
        </div>
        <p className="text-xs font-bold text-text-sub uppercase tracking-wider">{label}</p>
      </div>
      {action}
    </div>
  )
}

// ── Partiya stat pill ────────────────────────────────────────────────
function StatPill({ value, label, color, bg }) {
  return (
    <div className={`flex-1 ${bg} rounded-2xl p-4 flex flex-col items-center gap-1 min-w-0`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-semibold text-text-sub text-center leading-tight">{label}</p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function AdminStatistika() {
  const [period, setPeriod]       = useState('oylik')
  const [stats, setStats]         = useState(null)
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError]         = useState('')
  const [showAllGul, setShowAllGul] = useState(false)

  // Chart type matches period exactly
  const chartType = { kunlik: 'daily', haftalik: 'weekly', oylik: 'monthly', jami: 'alltime' }[period] || 'daily'
  const chartLabel = { daily: 'Oxirgi 14 kun', weekly: 'Oxirgi 8 hafta', monthly: 'Oxirgi 6 oy', alltime: 'Oxirgi 12 oy' }[chartType]

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setStats(await api.get(`/api/stats/admin?period=${period}`)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [period])

  const loadChart = useCallback(async () => {
    setChartLoading(true)
    try { setChartData(await api.get(`/api/stats/chart?type=${chartType}`)) }
    catch {}
    finally { setChartLoading(false) }
  }, [chartType])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadChart() }, [loadChart])

  const curPeriod = PERIODS.find(p => p.key === period)
  const turlar    = stats?.gul_turlari || []
  const maxDar    = Math.max(1, ...turlar.map(t => t.daromad))
  const bySabab   = stats?.atxod?.by_sabab || []
  const maxSab    = Math.max(1, ...bySabab.map(s => s.qty))
  const pt        = stats?.partiyalar || { jami: 0, yolda: 0, qabul_qilindi: 0, farq_bor: 0 }
  const prev      = stats?.prev
  const shownGul  = showAllGul ? turlar : turlar.slice(0, 3)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Statistika</h1>
        <button onClick={() => { load(); loadChart() }} className="p-2 rounded-xl hover:bg-cbg text-text-sub transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Period */}
      <div className="flex gap-1 bg-[#e9ebee] dark:bg-gray-800 rounded-xl p-1 mb-5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setShowAllGul(false) }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
              period === p.key ? 'bg-primary text-white shadow-sm' : 'text-text-sub hover:text-ctext'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* ── Chart ── */}
      <SLabel icon={BarChart3} label="Daromad grafigi" iconColor="text-primary" iconBg="bg-blue-bg"
        action={
          <span className="text-xs text-text-sub">{chartLabel}</span>
        }
      />

      <div className="bg-ccard border border-cborder rounded-2xl p-4 mb-5">
        {chartLoading ? (
          <div className="h-40 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData?.data?.length > 0 ? (
          <>
            <BarChart data={chartData.data} chartType={chartType} />
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-xs text-text-sub">
                  {{ daily:'Bu hafta', weekly:'Bu 4 hafta', monthly:'Bu 3 oy', alltime:'Bu yil' }[chartType]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-cbg border border-cborder" />
                <span className="text-xs text-text-sub">
                  {{ daily:"O'tgan hafta", weekly:"O'tgan 4 hafta", monthly:"O'tgan 3 oy", alltime:"O'tgan yil" }[chartType]}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-text-sub">Ma'lumot yo'q</p>
          </div>
        )}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* ── Moliya ── */}
          <SLabel icon={TrendingUp} label="Moliya" iconColor="text-cgreen" iconBg="bg-green-bg" />
          <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
            <MetricRow
              label="Daromad"
              cur={stats?.daromad}
              prev={prev?.daromad}
              color="text-cgreen"
            />
            <MetricRow
              label={`Atxod yo'qotish`}
              cur={stats?.yoqotish}
              prev={prev?.yoqotish}
              color="text-cred"
              divider
            />
            <div className="h-px bg-separator" />
            {/* Sof foyda */}
            <div className="flex items-center justify-between px-4 py-4 bg-cbg/40">
              <p className="text-sm font-bold text-ctext">Sof foyda</p>
              <div className="flex items-center gap-2">
                {prev && <Trend cur={stats?.sof_foyda ?? 0} prev={prev.daromad - prev.yoqotish} />}
                <p className={`text-base font-bold ${(stats?.sof_foyda ?? 0) >= 0 ? 'text-cgreen' : 'text-cred'}`}>
                  {money(stats?.sof_foyda ?? 0)}
                  <span className="text-xs font-normal text-text-sub ml-1">so'm</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Gul turlari ── */}
          <SLabel icon={Flower2} label="Gul turlari bo'yicha sotuv" iconColor="text-primary" iconBg="bg-blue-bg"
            action={
              turlar.length > 3 && (
                <button onClick={() => setShowAllGul(s => !s)}
                  className="flex items-center gap-1 text-xs text-primary font-semibold">
                  {showAllGul ? 'Kamroq' : `Hammasi (${turlar.length})`}
                  <ChevronDown size={13} className={`transition-transform ${showAllGul ? 'rotate-180' : ''}`} />
                </button>
              )
            }
          />
          {turlar.length === 0 ? (
            <div className="mb-5"><EmptyState text="Sotuv ma'lumoti yo'q" /></div>
          ) : (
            <div className="bg-ccard border border-cborder rounded-2xl mb-5 overflow-hidden divide-y divide-separator">
              {shownGul.map((t, i) => (
                <BarRow key={i} name={t._id} value={t.daromad}
                  displayVal={`${money(t.daromad)} s · ${t.qty} ta`}
                  max={maxDar} color="bg-primary" emoji="🌸" />
              ))}
              {!showAllGul && turlar.length > 3 && (
                <button onClick={() => setShowAllGul(true)}
                  className="w-full px-4 py-3 text-sm text-primary font-semibold text-center hover:bg-cbg transition-colors flex items-center justify-center gap-1">
                  Yana {turlar.length - 3} ta <ChevronDown size={14} />
                </button>
              )}
            </div>
          )}

          {/* ── Atxod ── */}
          <SLabel icon={Trash2} label="Atxod — sabab bo'yicha" iconColor="text-corange" iconBg="bg-orange-bg" />
          {bySabab.length === 0 ? (
            <div className="mb-5"><EmptyState text="Tasdiqlangan atxod yo'q" /></div>
          ) : (
            <div className="bg-ccard border border-cborder rounded-2xl mb-5 overflow-hidden divide-y divide-separator">
              {bySabab.map((s, i) => (
                <BarRow key={i} name={SABAB_LABEL[s._id] || s._id} value={s.qty}
                  displayVal={`${s.qty} ta`} max={maxSab} color="bg-corange"
                  emoji={SABAB_EMOJI[s._id] || '📦'} />
              ))}
            </div>
          )}

          {/* ── Partiyalar ── */}
          <SLabel icon={Package} label="Partiyalar holati" iconColor="text-ctext" iconBg="bg-cbg border border-cborder" />
          <div className="grid grid-cols-4 gap-2 mb-5">
            <StatPill value={pt.jami}          label="Jami"   color="text-ctext"   bg="bg-ccard border border-cborder" />
            <StatPill value={pt.yolda}         label="Yo'lda" color="text-primary" bg="bg-blue-bg" />
            <StatPill value={pt.qabul_qilindi} label="Qabul"  color="text-cgreen"  bg="bg-green-bg" />
            <StatPill value={pt.farq_bor}      label="Farq"   color="text-cred"    bg="bg-red-bg" />
          </div>

          {/* Atxod jami */}
          <div className="bg-ccard border border-cborder rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-bg flex items-center justify-center">
                <Trash2 size={16} className="text-corange" />
              </div>
              <div>
                <p className="text-xs text-text-sub">Jami atxod</p>
                <p className="text-base font-bold text-ctext">{stats?.atxod?.qty ?? 0} ta</p>
              </div>
            </div>
            {prev && curPeriod?.prevLabel && (
              <div className="text-right">
                <Trend cur={stats?.atxod?.qty ?? 0} prev={prev.atxodQty} />
                <p className="text-xs text-text-sub mt-1">{curPeriod.prevLabel} bilan</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
