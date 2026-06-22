import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Trash2, Package, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'
import { Badge, Spinner, EmptyState, ErrorMsg, SafeImg } from '../../components/ui'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function fmtDate(d) {
  const x = new Date(d)
  return x.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + x.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const SABAB_EMOJI = { "so'lgan": '🥀', nuqsonli: '⚠️', singan: '💔', boshqa: '📦' }
const SABAB_LABEL = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }

// ── Sotuvlar tab ─────────────────────────────────────────────────────
function SotuvlarTab({ list }) {
  const total    = list.reduce((s, x) => s + x.totalPrice, 0)
  const byKassa  = [...new Set(list.map(s => s.kassa?.name).filter(Boolean))]
  const [kassaF, setKassaF] = useState('hammasi')

  const shown = kassaF === 'hammasi' ? list : list.filter(s => s.kassa?.name === kassaF)

  return (
    <>
      {/* Total */}
      <div className="bg-primary-dk rounded-2xl p-4 flex items-center justify-between mb-4 text-white">
        <div>
          <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Umumiy tushum</p>
          <p className="text-xs text-white/60 mt-0.5">{list.length} ta sotuv</p>
        </div>
        <p className="text-2xl font-bold">{money(total)} <span className="text-sm font-normal text-white/70">so'm</span></p>
      </div>

      {/* Kassa filter */}
      {byKassa.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {['hammasi', ...byKassa].map(k => (
            <button
              key={k}
              onClick={() => setKassaF(k)}
              className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors ${
                kassaF === k
                  ? 'bg-primary text-white border-primary'
                  : 'bg-ccard text-text-sub border-cborder hover:border-primary'
              }`}
            >
              {k === 'hammasi' ? 'Hammasi' : k}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? <EmptyState text="Sotuv yo'q" /> : (
        <div className="space-y-3">
          {shown.map(sv => (
            <div key={sv._id} className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
              {sv.photo && <SafeImg src={sv.photo} className="w-full h-44" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-ctext">{sv.flowerType} · {sv.razmer}sm</p>
                      {sv.holat === 'nuqsonli' && (
                        <span className="text-xs bg-orange-bg text-corange px-2 py-0.5 rounded-full font-medium">Nuqsonli</span>
                      )}
                    </div>
                    <p className="text-xs text-text-sub">{sv.qty} ta × {money(sv.pricePerUnit)} so'm</p>
                    <p className="text-xs text-text-sub mt-0.5">
                      <span className="font-medium text-ctext">{sv.kassa?.name || 'Kassa'}</span> · {fmtDate(sv.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${sv.holat === 'nuqsonli' ? 'text-corange' : 'text-cgreen'}`}>
                      {money(sv.totalPrice)}
                    </p>
                    <p className="text-xs text-text-sub">so'm</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Atxodlar tab ─────────────────────────────────────────────────────
const STATUS_CLS = {
  pending:  'bg-orange-bg text-corange',
  approved: 'bg-green-bg text-cgreen',
  rejected: 'bg-red-bg text-cred',
}
const STATUS_LABEL = { pending: 'Kutilmoqda', approved: 'Tasdiqlandi', rejected: 'Rad etildi' }

function AtxodlarTab({ list }) {
  const [statusF, setStatusF] = useState('hammasi')

  const shown = statusF === 'hammasi' ? list : list.filter(a => a.status === statusF)
  const counts = { hammasi: list.length, pending: 0, approved: 0, rejected: 0 }
  list.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })

  return (
    <>
      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['hammasi', 'pending', 'approved', 'rejected'].map(k => (
          <button
            key={k}
            onClick={() => setStatusF(k)}
            className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              statusF === k
                ? 'bg-primary text-white border-primary'
                : 'bg-ccard text-text-sub border-cborder hover:border-primary'
            }`}
          >
            {k === 'hammasi' ? 'Hammasi' : STATUS_LABEL[k]}
            <span className={`min-w-[18px] h-4.5 text-xs font-bold px-1 rounded-full flex items-center justify-center ${
              statusF === k ? 'bg-white/20 text-white' : 'bg-cbg'
            }`}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? <EmptyState text="Atxod yo'q" /> : (
        <div className="space-y-3">
          {shown.map(a => (
            <div key={a._id} className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
              <SafeImg src={a.photo} className="w-full h-44" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm font-bold text-ctext">{a.flowerType} · {a.razmer}sm</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_CLS[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <p className="text-xs text-text-sub">
                  {a.qty} ta · {SABAB_EMOJI[a.sabab] || ''} {SABAB_LABEL[a.sabab] || a.sabab}
                </p>
                {a.qiymat > 0 && (
                  <p className="text-xs text-cred mt-0.5">Yo'qotish: {money(a.qiymat * a.qty)} so'm</p>
                )}
                <p className="text-xs text-text-sub mt-0.5">
                  <span className="font-medium text-ctext">{a.kassa?.name || 'Kassa'}</span> · {fmtDate(a.createdAt)}
                </p>
                {a.adminNote && (
                  <div className="mt-2 px-3 py-2 bg-cbg rounded-xl">
                    <p className="text-xs text-text-sub">Admin izohi: <span className="text-ctext font-medium">{a.adminNote}</span></p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Partiyalar tab ───────────────────────────────────────────────────
function summarize(flowers = []) {
  return flowers.map(f => `${f.type} (${f.sizes.reduce((s, x) => s + x.qty, 0)} ta)`).join(', ')
}

function PartiyaCard({ p }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(v => !v)}>
        {p.sentPhoto && (
          <img
            src={p.sentPhoto.startsWith('http') ? p.sentPhoto : `${API_URL}${p.sentPhoto}`}
            className="w-14 h-14 rounded-xl object-cover shrink-0"
            alt=""
            onError={e => { e.target.style.display='none' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-ctext">{p.batchId}</p>
            <Badge status={p.status} />
          </div>
          <p className="text-xs text-text-sub">
            <span className="font-medium text-ctext">{p.teplitsa?.name || 'Teplitsa'}</span>
            {' → '}
            <span className="font-medium text-ctext">{p.kassa?.name || 'Kassa'}</span>
          </p>
          <p className="text-xs text-text-sub mt-0.5">{summarize(p.sent)}</p>
          <p className="text-xs text-text-sub/60 mt-0.5">{fmtDate(p.createdAt)}</p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-text-sub shrink-0" />
          : <ChevronDown size={16} className="text-text-sub shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-separator">
          {/* Yuborilgan rasm (katta) */}
          {p.sentPhoto && (
            <div>
              <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-4 pt-3 pb-1.5">Yuborilgan rasm</p>
              <img
                src={p.sentPhoto.startsWith('http') ? p.sentPhoto : `${API_URL}${p.sentPhoto}`}
                className="w-full max-h-60 object-cover"
                alt=""
              />
            </div>
          )}

          {/* Qabul rasmi */}
          {p.photo && (
            <div>
              <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-4 pt-3 pb-1.5">Qabul rasmi</p>
              <img
                src={p.photo.startsWith('http') ? p.photo : `${API_URL}${p.photo}`}
                className="w-full max-h-60 object-cover"
                alt=""
              />
            </div>
          )}

          {/* Yuborilgan gullar */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Yuborilgan</p>
            <div className="space-y-2">
              {(p.sent || []).map((f, i) => (
                <div key={i} className="bg-cbg rounded-xl px-3 py-2.5">
                  <p className="text-sm font-semibold text-ctext mb-1.5">{f.type}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.sizes.map((s, j) => (
                      <span key={j} className="text-xs bg-ccard border border-cborder rounded-lg px-2.5 py-1 text-ctext font-medium">
                        {s.sm}sm — {s.qty} ta
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Farq */}
            {p.farq && p.farq.length > 0 && (
              <>
                <p className="text-xs font-semibold text-cred uppercase tracking-wider mt-3 mb-2">Farqlar</p>
                <div className="space-y-1.5">
                  {p.farq.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-bg/40 border border-cred/20 rounded-xl px-3 py-2">
                      <span className="text-xs text-ctext font-medium">{f.type} {f.sm}sm</span>
                      <span className="text-xs text-cred font-semibold">
                        Yuborildi: {f.sent} · Keldi: {f.received} · Farq: {f.diff > 0 ? '+' : ''}{f.diff}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PartiyalarTab({ list }) {
  const [statusF, setStatusF] = useState('hammasi')

  const shown  = statusF === 'hammasi' ? list : list.filter(p => p.status === statusF)
  const counts = {
    hammasi:       list.length,
    yolda:         list.filter(p => p.status === 'yolda').length,
    qabul_qilindi: list.filter(p => p.status === 'qabul_qilindi').length,
    farq_bor:      list.filter(p => p.status === 'farq_bor').length,
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { key: 'hammasi',       label: 'Hammasi' },
          { key: 'yolda',         label: "Yo'lda" },
          { key: 'qabul_qilindi', label: 'Qabul' },
          { key: 'farq_bor',      label: 'Farq bor' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusF(f.key)}
            className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              statusF === f.key
                ? 'bg-primary text-white border-primary'
                : 'bg-ccard text-text-sub border-cborder hover:border-primary'
            }`}
          >
            {f.label}
            <span className={`min-w-[18px] text-xs font-bold px-1 rounded-full ${
              statusF === f.key ? 'bg-white/20 text-white' : 'bg-cbg text-text-sub'
            }`}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? <EmptyState text="Partiya yo'q" /> : (
        <div className="space-y-3">
          {shown.map(p => <PartiyaCard key={p._id} p={p} />)}
        </div>
      )}
    </>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'sotuv',    label: 'Sotuvlar',   icon: ShoppingCart, color: 'bg-cgreen' },
  { key: 'atxod',   label: 'Atxodlar',   icon: Trash2,        color: 'bg-cred'  },
  { key: 'partiya', label: 'Partiyalar', icon: Package,       color: 'bg-primary' },
]

export default function AdminTarix() {
  const [tab, setTab]           = useState('sotuv')
  const [sotuvlar, setSotuvlar] = useState([])
  const [atxodlar, setAtxodlar] = useState([])
  const [partiyalar, setPartiyalar] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [sv, ax, pt] = await Promise.all([
        api.get('/api/sotuv'),
        api.get('/api/atxod'),
        api.get('/api/partiya'),
      ])
      setSotuvlar(sv.sotuvlar || [])
      setAtxodlar(ax || [])
      setPartiyalar(pt || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const counts = { sotuv: sotuvlar.length, atxod: atxodlar.length, partiya: partiyalar.length }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Umumiy tarix</h1>
        <button
          onClick={load}
          className="p-2 rounded-xl hover:bg-cbg text-text-sub hover:text-ctext transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#e9ebee] dark:bg-gray-800 rounded-xl p-1 mb-5">
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                active ? `${t.color} text-white shadow-sm` : 'text-text-sub'
              }`}
            >
              <Icon size={13} />
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/20 text-white' : 'bg-cbg text-text-sub'
                }`}>{counts[t.key]}</span>
              )}
            </button>
          )
        })}
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : (
        <>
          {tab === 'sotuv'    && <SotuvlarTab   list={sotuvlar}   />}
          {tab === 'atxod'    && <AtxodlarTab   list={atxodlar}   />}
          {tab === 'partiya'  && <PartiyalarTab list={partiyalar} />}
        </>
      )}
    </div>
  )
}
