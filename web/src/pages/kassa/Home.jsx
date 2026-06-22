import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, Flower2, Package, Plus, Trash2, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'
import { StatCard, Badge, PrimaryButton, Spinner, ErrorMsg } from '../../components/ui'

function money(n) { return (n || 0).toLocaleString('ru-RU') }

export default function KassaHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats]       = useState({ daromad: 0, sotildi: 0 })
  const [yolda, setYolda]       = useState([])
  const [sotuvlar, setSotuvlar] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [st, partiyalar, sales] = await Promise.all([
        api.get('/api/stats/kassa?period=kunlik'),
        api.get('/api/partiya'),
        api.get('/api/sotuv'),
      ])
      setStats(st)
      setYolda(partiyalar.filter(p => p.status === 'yolda'))
      setSotuvlar(sales.sotuvlar.slice(0, 10))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">


      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : (
        <>
          {/* Stats */}
          <div className="flex gap-3 mb-6">
            <StatCard
              label="Bugungi tushum"
              value={money(stats.daromad)}
              unit="so'm"
              icon={<DollarSign size={17} />}
              bg="bg-green-bg"
              textColor="text-cgreen"
            />
            <StatCard
              label="Sotilgan gullar"
              value={String(stats.sotildi)}
              unit="ta bugun"
              icon={<Flower2 size={17} />}
              bg="bg-blue-bg"
              textColor="text-primary"
            />
          </div>

          {/* Qabul section */}
          <div className="flex items-center gap-2 mb-3">
            <Package size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-ctext">Qabul · Teplitsadan</h2>
            {yolda.length > 0 && (
              <span className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {yolda.length}
              </span>
            )}
          </div>

          {yolda.length === 0 ? (
            <div className="bg-ccard border border-cborder rounded-2xl p-6 text-center mb-6">
              <p className="text-sm font-semibold text-ctext mb-1">Hozircha yangi partiya yo'q</p>
              <p className="text-xs text-text-sub">Teplitsa partiya yuborsa, shu yerda paydo bo'ladi</p>
            </div>
          ) : (
            <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-6">
              {yolda.map((p, i) => (
                <button
                  key={p._id}
                  onClick={() => navigate(`/kassa/qabul?id=${p._id}`)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-cbg transition-colors ${i > 0 ? 'border-t border-separator' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ctext">{p.batchId}</p>
                    <p className="text-xs text-text-sub mt-0.5">{p.teplitsa?.name || 'Teplitsa'} yubordi · qabul qiling</p>
                  </div>
                  <Badge status={p.status} />
                  <ChevronRight size={16} className="text-cborder" />
                </button>
              ))}
            </div>
          )}

          {/* Sotuv */}
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={20} className="text-cgreen" />
            <h2 className="text-lg font-bold text-ctext">Sotuv</h2>
          </div>

          <div className="space-y-3 mb-6">
            <PrimaryButton
              title="Yangi sotuv qo'shish"
              icon={<Plus size={18} />}
              onClick={() => navigate('/kassa/sotuv')}
            />
            <button
              onClick={() => navigate('/kassa/atxod')}
              className="flex items-center justify-center gap-2 w-full h-[50px] rounded-xl border-[1.5px] border-corange text-corange bg-ccard font-semibold text-base hover:bg-orange-bg transition-colors"
            >
              <Trash2 size={18} />
              Atxod kiritish
            </button>
          </div>

          {/* Recent sales */}
          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">So'nggi sotuvlar</p>
          {sotuvlar.length === 0 ? (
            <p className="text-center text-cgray text-sm py-4">Hozircha sotuv yo'q</p>
          ) : (
            <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
              {sotuvlar.map((sv, i) => (
                <div key={sv._id} className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-separator' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ctext">{sv.flowerType} {sv.razmer}sm</p>
                    <p className="text-xs text-text-sub mt-0.5">
                      {sv.qty} ta {sv.holat === 'nuqsonli' ? '· Nuqsonli' : ''}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ${sv.holat === 'nuqsonli' ? 'text-corange' : 'text-cgreen'}`}>
                    {money(sv.totalPrice)} s
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
