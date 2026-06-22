import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg } from '../../components/ui'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function fmt(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSotuvlar() {
  const [sotuvlar, setSotuvlar] = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await api.get('/api/sotuv')
      setSotuvlar(data.sotuvlar)
      setTotal(data.total)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Sotuvlar</h1>
        <button onClick={load} className="p-2 rounded-xl hover:bg-cbg text-text-sub transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Total */}
      <div className="bg-primary-dk rounded-2xl p-5 flex items-center justify-between mb-5 text-white">
        <div>
          <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Umumiy tushum</p>
          <p className="text-xs text-white/60 mt-0.5">{sotuvlar.length} ta sotuv</p>
        </div>
        <p className="text-3xl font-bold tracking-tight">{money(total)} <span className="text-base font-medium text-white/70">s</span></p>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : sotuvlar.length === 0 ? (
        <EmptyState text="Hozircha sotuv yo'q" />
      ) : (
        <div className="bg-ccard rounded-2xl border border-cborder overflow-hidden">
          {sotuvlar.map((sv, i) => (
            <div key={sv._id} className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-separator' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ctext">
                  {sv.flowerType} {sv.razmer}sm
                  {sv.holat === 'nuqsonli' && <span className="text-corange font-normal text-xs ml-2">· Nuqsonli</span>}
                </p>
                <p className="text-xs text-text-sub mt-0.5">
                  {sv.qty} ta × {money(sv.pricePerUnit)} · {sv.kassa?.name || 'Kassa'}
                </p>
                <p className="text-xs text-[#9aa0a8] mt-0.5">{fmt(sv.createdAt)}</p>
              </div>
              <p className={`text-sm font-bold shrink-0 ${sv.holat === 'nuqsonli' ? 'text-corange' : 'text-cgreen'}`}>
                {money(sv.totalPrice)} s
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
