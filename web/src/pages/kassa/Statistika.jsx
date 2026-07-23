import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, BarChart3, Flower2, Trash2, ChevronDown, Wallet } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg } from '../../components/ui'
import SavdoCard from '../../components/SavdoCard'
import SavdoChart from '../../components/SavdoChart'
import OyTaqqos from '../../components/OyTaqqos'
import { money, BarRow, SLabel, StatPill } from '../../components/StatBits'

// Kassa statistikasi. Admin sahifasi bilan bir xil bo'laklardan yig'ilgan,
// lekin faqat shu kassaning o'z ma'lumoti ko'rinadi — scope ni backend qo'yadi
// (/api/stats/chart va /api/stats/oy-taqqos rolga qarab kassa bo'yicha filtrlaydi).

const PERIODS = [
  { key: 'kunlik',   label: 'Kunlik'   },
  { key: 'haftalik', label: 'Haftalik' },
  { key: 'oylik',    label: 'Oylik'    },
  { key: 'jami',     label: 'Jami'     },
]

const CHART_TYPE  = { kunlik: 'daily', haftalik: 'weekly', oylik: 'monthly', jami: 'alltime' }
const CHART_LABEL = { daily: 'Oxirgi 14 kun', weekly: 'Oxirgi 8 hafta', monthly: 'Oxirgi 6 oy', alltime: 'Oxirgi 12 oy' }
const SAVDO_TITLE = { kunlik: 'Bugungi savdo', haftalik: 'Haftalik savdo', oylik: 'Oylik savdo', jami: 'Umumiy savdo' }

export default function KassaStatistika() {
  const [period, setPeriod]   = useState('oylik')
  const [stats, setStats]     = useState(null)
  const [chartData, setChart] = useState(null)
  const [taqqos, setTaqqos]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError]     = useState('')
  const [hammaGul, setHammaGul] = useState(false)

  const chartType = CHART_TYPE[period] || 'daily'

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Oylik taqqoslash davrga bog'liq emas — u har doim kalendar oy bo'yicha
      const [st, tq] = await Promise.all([
        api.get(`/api/stats/kassa?period=${period}`),
        api.get('/api/stats/oy-taqqos'),
      ])
      setStats(st); setTaqqos(tq)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [period])

  const loadChart = useCallback(async () => {
    setChartLoading(true)
    try { setChart(await api.get(`/api/stats/chart?type=${chartType}`)) }
    catch { /* grafik bo'lmasa sahifa baribir ishlaydi */ }
    finally { setChartLoading(false) }
  }, [chartType])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadChart() }, [loadChart])

  const turlar   = stats?.gul_turlari || []
  const maxDar   = Math.max(1, ...turlar.map(t => t.daromad))
  const shownGul = hammaGul ? turlar : turlar.slice(0, 3)
  const atxod    = stats?.atxod || {}

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Statistika</h1>
        <button onClick={() => { load(); loadChart() }}
          className="p-2 rounded-xl hover:bg-cbg text-text-sub hover:text-ctext transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Davr */}
      <div className="flex gap-1 bg-[#e9ebee] dark:bg-gray-800 rounded-xl p-1 mb-5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setHammaGul(false) }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
              period === p.key ? 'bg-primary text-white shadow-sm' : 'text-text-sub hover:text-ctext'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Grafik: pul yoki gullar soni */}
      <SLabel icon={BarChart3} label="Savdo grafigi" iconColor="text-primary" iconBg="bg-blue-bg"
        action={<span className="text-xs text-text-sub">{CHART_LABEL[chartType]}</span>} />
      <SavdoChart data={chartData?.data} chartType={chartType} loading={chartLoading} className="mb-5" />

      {loading ? <Spinner /> : (
        <>
          {/* Savdo taqsimoti — naqt / karta / qarz */}
          <SLabel icon={Wallet} label="Savdo" iconColor="text-cgreen" iconBg="bg-green-bg" />
          <SavdoCard savdo={stats?.savdo} tushum={stats?.tushum} title={SAVDO_TITLE[period]} />

          {/* Oylik taqqoslash — bu oy vs o'tgan oy (kalendar oy) */}
          <OyTaqqos data={taqqos} className="mb-5" />

          {/* Gul turlari — qarzga berilgan gullar ham hisobda */}
          <SLabel icon={Flower2} label="Gul turlari bo'yicha sotuv" iconColor="text-primary" iconBg="bg-blue-bg"
            action={turlar.length > 3 && (
              <button onClick={() => setHammaGul(s => !s)}
                className="flex items-center gap-1 text-xs text-primary font-semibold">
                {hammaGul ? 'Kamroq' : `Hammasi (${turlar.length})`}
                <ChevronDown size={13} className={`transition-transform ${hammaGul ? 'rotate-180' : ''}`} />
              </button>
            )} />
          {turlar.length === 0 ? (
            <div className="mb-5"><EmptyState text="Bu davrda sotuv yo'q" /></div>
          ) : (
            <div className="bg-ccard border border-cborder rounded-2xl mb-5 overflow-hidden divide-y divide-separator">
              {shownGul.map((t, i) => (
                <BarRow key={i} name={t._id} value={t.daromad}
                  displayVal={`${money(t.daromad)} s · ${t.qty} ta`}
                  max={maxDar} color="bg-primary" emoji="🌸" />
              ))}
              {!hammaGul && turlar.length > 3 && (
                <button onClick={() => setHammaGul(true)}
                  className="w-full px-4 py-3 text-sm text-primary font-semibold text-center hover:bg-cbg transition-colors flex items-center justify-center gap-1">
                  Yana {turlar.length - 3} ta <ChevronDown size={14} />
                </button>
              )}
            </div>
          )}

          {/* Atxod holati */}
          <SLabel icon={Trash2} label="Atxod" iconColor="text-corange" iconBg="bg-orange-bg" />
          <div className="grid grid-cols-3 gap-2">
            <StatPill value={atxod.pending  ?? 0} label="Kutilmoqda"  color="text-corange" bg="bg-orange-bg" />
            <StatPill value={atxod.approved ?? 0} label="Tasdiqlandi" color="text-cgreen"  bg="bg-green-bg" />
            <StatPill value={atxod.rejected ?? 0} label="Rad etildi"  color="text-cred"    bg="bg-red-bg" />
          </div>
        </>
      )}
    </div>
  )
}
