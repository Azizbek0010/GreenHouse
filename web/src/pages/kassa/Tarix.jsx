import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Trash2, Lock } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg, SafeImg } from '../../components/ui'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function fmtDate(d) {
  const x = new Date(d)
  return x.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + x.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

const SABAB_LABEL = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }
const SABAB_EMOJI = { "so'lgan": '🥀', nuqsonli: '⚠️', singan: '💔', boshqa: '📦' }
const STATUS_MAP  = {
  pending:  { label: 'Kutilmoqda', cls: 'bg-orange-bg text-corange' },
  approved: { label: 'Tasdiqlandi', cls: 'bg-green-bg text-cgreen' },
  rejected: { label: 'Rad etildi', cls: 'bg-red-bg text-cred' },
}

export default function KassaTarix() {
  const [tab, setTab]         = useState('sotuv')
  const [sotuvlar, setSotuvlar] = useState([])
  const [atxodlar, setAtxodlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [sv, ax] = await Promise.all([
        api.get('/api/sotuv'),
        api.get('/api/atxod'),
      ])
      setSotuvlar(sv.sotuvlar || [])
      setAtxodlar(ax || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalSotuv = sotuvlar.reduce((s, x) => s + x.totalPrice, 0)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight flex-1">Tarix</h1>
        <div className="flex items-center gap-1.5 text-xs text-text-sub bg-cbg border border-cborder rounded-lg px-2.5 py-1.5">
          <Lock size={11} />
          Faqat ko'rish
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#e9ebee] dark:bg-gray-800 rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('sotuv')}
          className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            tab === 'sotuv' ? 'bg-primary text-white shadow-sm' : 'text-text-sub'
          }`}
        >
          <ShoppingCart size={14} /> Sotuvlar
        </button>
        <button
          onClick={() => setTab('atxod')}
          className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            tab === 'atxod' ? 'bg-cred text-white shadow-sm' : 'text-text-sub'
          }`}
        >
          <Trash2 size={14} /> Atxodlar
        </button>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : tab === 'sotuv' ? (
        <>
          {/* Sotuv total */}
          {sotuvlar.length > 0 && (
            <div className="bg-green-bg border border-cgreen/20 rounded-2xl p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-cgreen">Jami daromad</p>
                <p className="text-xs text-cgreen/70 mt-0.5">{sotuvlar.length} ta sotuv</p>
              </div>
              <p className="text-xl font-bold text-cgreen">{money(totalSotuv)} <span className="text-sm font-normal">so'm</span></p>
            </div>
          )}

          {sotuvlar.length === 0 ? <EmptyState text="Hozircha sotuv yo'q" /> : (
            <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden divide-y divide-separator">
              {sotuvlar.map(sv => (
                <div key={sv._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-ctext">{sv.flowerType} · {sv.razmer}sm</p>
                        {sv.holat === 'nuqsonli' && (
                          <span className="text-xs bg-orange-bg text-corange px-2 py-0.5 rounded-full font-medium">Nuqsonli</span>
                        )}
                      </div>
                      <p className="text-xs text-text-sub mt-1">{sv.qty} ta · {money(sv.pricePerUnit)} so'm/dona</p>
                      <p className="text-xs text-text-sub/60 mt-0.5">{fmtDate(sv.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-cgreen">{money(sv.totalPrice)}</p>
                      <p className="text-xs text-text-sub">so'm</p>
                    </div>
                  </div>
                  <SafeImg src={sv.photo} className="mt-3 h-36 w-full object-cover rounded-xl" />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Atxod tab */
        atxodlar.length === 0 ? <EmptyState text="Hozircha atxod yo'q" /> : (
          <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden divide-y divide-separator">
            {atxodlar.map(ax => {
              const st = STATUS_MAP[ax.status] || STATUS_MAP.pending
              return (
                <div key={ax._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-ctext">{ax.flowerType} · {ax.razmer}sm</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-text-sub mt-1">
                        {ax.qty} ta · {SABAB_EMOJI[ax.sabab] || ''} {SABAB_LABEL[ax.sabab] || ax.sabab}
                      </p>
                      {ax.qiymat > 0 && (
                        <p className="text-xs text-cred mt-0.5">Yo'qotish: {money(ax.qiymat * ax.qty)} so'm</p>
                      )}
                      <p className="text-xs text-text-sub/60 mt-0.5">{fmtDate(ax.createdAt)}</p>
                    </div>
                  </div>
                  <SafeImg src={ax.photo} className="mt-3 h-36 w-full object-cover rounded-xl" />
                  {ax.adminNote && (
                    <div className="mt-2 px-3 py-2 bg-cbg rounded-xl">
                      <p className="text-xs text-text-sub">Admin izohi: <span className="text-ctext font-medium">{ax.adminNote}</span></p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
