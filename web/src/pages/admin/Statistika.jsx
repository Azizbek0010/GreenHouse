import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, Flower2, Trash2, Package, BarChart3 } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg } from '../../components/ui'
import SavdoChart from '../../components/SavdoChart'
import OyTaqqos from '../../components/OyTaqqos'
import { money, Trend, MetricRow, BarRow, SLabel, StatPill } from '../../components/StatBits'

const PERIODS = [
  { key: 'kunlik',   label: 'Kunlik',   prevLabel: 'Kecha' },
  { key: 'haftalik', label: 'Haftalik', prevLabel: "O'tgan hafta" },
  { key: 'oylik',    label: 'Oylik',    prevLabel: "O'tgan oy" },
  { key: 'jami',     label: 'Jami',     prevLabel: null },
]
const SABAB_LABEL = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }
const SABAB_EMOJI = { "so'lgan": '🥀', nuqsonli: '⚠️', singan: '💔', boshqa: '📦' }

// ── Main ─────────────────────────────────────────────────────────────
export default function AdminStatistika() {
  const [period, setPeriod]       = useState('oylik')
  const [stats, setStats]         = useState(null)
  const [chartData, setChartData] = useState(null)
  const [taqqos, setTaqqos]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError]         = useState('')
  const [showAllGul, setShowAllGul] = useState(false)

  // Chart type matches period exactly
  const chartType = { kunlik: 'daily', haftalik: 'weekly', oylik: 'monthly', jami: 'alltime' }[period] || 'daily'
  const chartLabel = { daily: 'Oxirgi 14 kun', weekly: 'Oxirgi 8 hafta', monthly: 'Oxirgi 6 oy', alltime: 'Oxirgi 12 oy' }[chartType]

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Oylik taqqoslash davrga bog'liq emas — u har doim kalendar oy bo'yicha
      const [st, tq] = await Promise.all([
        api.get(`/api/stats/admin?period=${period}`),
        api.get('/api/stats/oy-taqqos'),
      ])
      setStats(st)
      setTaqqos(tq)
    }
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
  const hafta     = stats?.hafta_gullar
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

      {/* ── Chart: pul yoki gullar soni ── */}
      <SLabel icon={BarChart3} label="Savdo grafigi" iconColor="text-primary" iconBg="bg-blue-bg"
        action={
          <span className="text-xs text-text-sub">{chartLabel}</span>
        }
      />
      <SavdoChart
        data={chartData?.data}
        chartType={chartType}
        loading={chartLoading}
        className="mb-5"
      />

      {loading ? <Spinner /> : (
        <>
          {/* ── Oylik taqqoslash: bu oy vs o'tgan oy (kalendar oy) ── */}
          <OyTaqqos data={taqqos} className="mb-5" />

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

          {/* ── Bu hafta: eng ko'p / eng kam sotilgan gul (sotuv bo'lmasa ko'rsatilmaydi) ── */}
          {hafta?.top?.qty > 0 && (
            <>
              <SLabel icon={Flower2} label="Bu hafta (7 kun)" iconColor="text-corange" iconBg="bg-orange-bg" />
              <div className="flex gap-3 mb-5">
                <div className="flex-1 bg-green-bg rounded-2xl p-4 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} className="text-cgreen" />
                    <p className="text-[11px] font-semibold text-cgreen uppercase tracking-wider">Eng ko'p sotilgan</p>
                  </div>
                  <p className="text-base font-bold text-ctext truncate">{hafta.top.type}</p>
                  <p className="text-sm font-semibold text-cgreen mt-0.5">{hafta.top.qty} ta</p>
                </div>
                {hafta.low && hafta.low.type !== hafta.top.type && (
                  <div className="flex-1 bg-red-bg rounded-2xl p-4 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingDown size={14} className="text-cred" />
                      <p className="text-[11px] font-semibold text-cred uppercase tracking-wider">Eng kam sotilgan</p>
                    </div>
                    <p className="text-base font-bold text-ctext truncate">{hafta.low.type}</p>
                    <p className="text-sm font-semibold text-cred mt-0.5">{hafta.low.qty} ta</p>
                  </div>
                )}
              </div>
            </>
          )}

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
