import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Trash2, Lock, HandCoins, User, Phone, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg, SafeImg } from '../../components/ui'
import BottomModal from '../../components/BottomModal'

const UZ_MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr']

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function num(s)   { return parseInt(String(s).replace(/\s/g, '')) || 0 }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }
function soat(d) {
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
function dateKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
}
function dateLabel(d) {
  const dt = new Date(d)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (dateKey(dt) === dateKey(today))     return 'Bugun'
  if (dateKey(dt) === dateKey(yesterday)) return 'Kecha'
  return `${dt.getDate()} ${UZ_MONTHS[dt.getMonth()]}`
}
function groupByDate(items, dateOf = it => it.createdAt) {
  const groups = []
  const seen = {}
  for (const item of items) {
    const key = dateKey(dateOf(item))
    if (!seen[key]) {
      seen[key] = { label: dateLabel(dateOf(item)), items: [] }
      groups.push(seen[key])
    }
    seen[key].items.push(item)
  }
  return groups
}
function flowersSummary(flowers = []) {
  return flowers.map(f => `${f.type} ${f.razmer}sm · ${f.qty} ta`).join(', ')
}

const SABAB_LABEL = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }
const SABAB_EMOJI = { "so'lgan": '🥀', nuqsonli: '⚠️', singan: '💔', boshqa: '📦' }
const STATUS_MAP  = {
  pending:  { label: 'Kutilmoqda', cls: 'bg-orange-bg text-corange' },
  approved: { label: 'Tasdiqlandi', cls: 'bg-green-bg text-cgreen' },
  rejected: { label: 'Rad etildi', cls: 'bg-red-bg text-cred' },
}

// ── To'lov (payment) modal ─────────────────────────────────────────
function TolovModal({ qarz, onClose, onPaid }) {
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState('')
  if (!qarz) return null

  const remaining = qarz.totalPrice - qarz.paidAmount

  const pay = async () => {
    const val = num(amount)
    if (!(val > 0))          return setError('Summani kiriting')
    if (val > remaining)     return setError(`Qoldiqdan (${money(remaining)}) oshib ketdi`)
    setError(''); setPaying(true)
    try {
      await api.patch(`/api/qarz/${qarz._id}/tolov`, { amount: val })
      onPaid()
    } catch (e) {
      setError(e.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <BottomModal open={!!qarz} onClose={onClose} title={`${qarz.buyer.name} — qarzni to'lash`}>
      <div className="px-5 pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-text-sub">Umumiy qarz</span>
          <span className="text-sm font-semibold text-ctext">{money(qarz.totalPrice)} so'm</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-text-sub">To'langan</span>
          <span className="text-sm font-semibold text-cgreen">{money(qarz.paidAmount)} so'm</span>
        </div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-separator">
          <span className="text-sm text-text-sub">Qoldiq</span>
          <span className="text-base font-bold text-corange">{money(remaining)} so'm</span>
        </div>

        <ErrorMsg msg={error} onClose={() => setError('')} />

        <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">To'lov summasi</p>
        <div className="flex items-center bg-cbg border border-cborder rounded-xl px-4 py-3 mb-2">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={fmtInput(amount)}
            onChange={e => setAmount(e.target.value.replace(/[\s\D]/g, ''))}
            placeholder="0"
            className="flex-1 bg-transparent text-ctext text-lg font-semibold outline-none"
          />
          <span className="text-text-sub text-sm">so'm</span>
        </div>
        <button
          onClick={() => setAmount(String(remaining))}
          className="text-xs text-primary font-semibold mb-4 hover:underline"
        >
          To'liq to'lash ({money(remaining)} so'm)
        </button>

        <button
          onClick={pay}
          disabled={paying}
          className="w-full h-12 rounded-xl bg-cgreen text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {paying
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Check size={18} /> To'lovni saqlash</>
          }
        </button>
      </div>
    </BottomModal>
  )
}

// ── Qarz card ──────────────────────────────────────────────────────
function QarzCard({ q, onPay }) {
  const remaining = q.totalPrice - q.paidAmount
  const pct = q.totalPrice > 0 ? Math.min(100, Math.round((q.paidAmount / q.totalPrice) * 100)) : 0
  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-ctext">{q.buyer?.name}</p>
              {q.isPaid ? (
                <span className="text-xs bg-green-bg text-cgreen px-2 py-0.5 rounded-full font-medium">To'landi</span>
              ) : (
                <span className="text-xs bg-orange-bg text-corange px-2 py-0.5 rounded-full font-medium">Qarzdor</span>
              )}
            </div>
            <a href={`tel:${q.buyer?.phone}`} className="text-xs text-primary mt-0.5 flex items-center gap-1">
              <Phone size={11} /> {q.buyer?.phone}
            </a>
            <p className="text-xs text-text-sub mt-1">{flowersSummary(q.flowers)}</p>
            <p className="text-xs text-text-sub/60 mt-0.5">{soat(q.createdAt)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold text-ctext">{money(q.totalPrice)}</p>
            <p className="text-xs text-text-sub">so'm</p>
          </div>
        </div>

        {/* Progress */}
        {!q.isPaid && q.paidAmount > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-cbg rounded-full overflow-hidden">
              <div className="h-full bg-cgreen" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-cgreen">To'landi: {money(q.paidAmount)}</span>
              <span className="text-xs text-corange">Qoldiq: {money(remaining)}</span>
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <p className="text-[10px] text-text-sub mb-1">Gul</p>
            <SafeImg src={q.flowerPhoto} className="h-28 w-full rounded-xl" />
          </div>
          <div>
            <p className="text-[10px] text-text-sub mb-1">Sotib oluvchi</p>
            <SafeImg src={q.buyer?.photo} className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {!q.isPaid && (
        <button
          onClick={() => onPay(q)}
          className="w-full py-3 bg-green-bg text-cgreen font-semibold text-sm border-t border-separator hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
        >
          <HandCoins size={16} /> To'lov qilish
        </button>
      )}
    </div>
  )
}

export default function KassaTarix() {
  const [tab, setTab]           = useState('sotuv')
  const [sotuvlar, setSotuvlar] = useState([])
  const [qarzlar, setQarzlar]   = useState([])
  const [qarzSum, setQarzSum]   = useState({ totalQarz: 0, totalPaid: 0, qoldiq: 0 })
  const [atxodlar, setAtxodlar] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [payQarz, setPayQarz]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [sv, qz, ax] = await Promise.all([
        api.get('/api/sotuv'),
        api.get('/api/qarz'),
        api.get('/api/atxod'),
      ])
      setSotuvlar(sv.sotuvlar || [])
      setQarzlar(qz.qarzlar || [])
      setQarzSum({ totalQarz: qz.totalQarz || 0, totalPaid: qz.totalPaid || 0, qoldiq: qz.qoldiq || 0 })
      setAtxodlar(ax || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalSotuv = sotuvlar.reduce((s, x) => s + x.totalPrice, 0)
  const paidQarz   = qarzlar.filter(q => q.isPaid)
  const openQarz   = qarzlar.filter(q => !q.isPaid)
  // Variant A: daromad = odi sotuvlar + qarzdan haqiqatda tushgan pul (paidAmount)
  const daromad    = totalSotuv + qarzSum.totalPaid

  const onPaid = () => { setPayQarz(null); load() }

  // Sotuvlar tab: odi sotuvlar + yopilgan qarzlar (tarixga tushgan) — sana bo'yicha
  const sotuvFeed = [
    ...sotuvlar.map(s => ({ ...s, _kind: 'sotuv', _date: s.createdAt })),
    ...paidQarz.map(q => ({ ...q, _kind: 'qarz', _date: q.paidAt || q.createdAt })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date))

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
          className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'sotuv' ? 'bg-primary text-white shadow-sm' : 'text-text-sub'
          }`}
        >
          <ShoppingCart size={13} /> Sotuvlar
        </button>
        <button
          onClick={() => setTab('qarz')}
          className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'qarz' ? 'bg-corange text-white shadow-sm' : 'text-text-sub'
          }`}
        >
          <HandCoins size={13} /> Qarzdorliklar
          {openQarz.length > 0 && (
            <span className={`text-[10px] rounded-full w-4 h-4 flex items-center justify-center ${tab === 'qarz' ? 'bg-white/25' : 'bg-corange text-white'}`}>
              {openQarz.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('atxod')}
          className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'atxod' ? 'bg-cred text-white shadow-sm' : 'text-text-sub'
          }`}
        >
          <Trash2 size={13} /> Atxodlar
        </button>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : tab === 'sotuv' ? (
        <>
          {sotuvFeed.length > 0 && (
            <div className="bg-green-bg border border-cgreen/20 rounded-2xl p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-cgreen">Jami daromad</p>
                <p className="text-xs text-cgreen/70 mt-0.5">
                  {sotuvlar.length} ta sotuv{qarzSum.totalPaid > 0 ? ` + qarzdan ${money(qarzSum.totalPaid)}` : ''}
                </p>
              </div>
              <p className="text-xl font-bold text-cgreen">{money(daromad)} <span className="text-sm font-normal">so'm</span></p>
            </div>
          )}

          {sotuvFeed.length === 0 ? <EmptyState text="Hozircha sotuv yo'q" /> : (
            <div>
              {groupByDate(sotuvFeed, it => it._date).map(group => (
                <div key={group.label}>
                  <p className="text-xs font-bold text-text-sub uppercase tracking-wider px-1 pt-4 pb-2 first:pt-0">{group.label}</p>
                  <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden divide-y divide-separator">
                    {group.items.map(it => it._kind === 'sotuv' ? (
                      <div key={it._id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-ctext">{it.flowerType} · {it.razmer}sm</p>
                              {it.holat === 'nuqsonli' && (
                                <span className="text-xs bg-orange-bg text-corange px-2 py-0.5 rounded-full font-medium">Nuqsonli</span>
                              )}
                            </div>
                            <p className="text-xs text-text-sub mt-1">{it.qty} ta · {money(it.pricePerUnit)} so'm/dona</p>
                            <p className="text-xs text-text-sub/60 mt-0.5">{soat(it.createdAt)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold text-cgreen">{money(it.totalPrice)}</p>
                            <p className="text-xs text-text-sub">so'm</p>
                          </div>
                        </div>
                        <SafeImg src={it.photo} className="mt-3 h-36 w-full rounded-xl" />
                      </div>
                    ) : (
                      <div key={it._id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-ctext">{it.buyer?.name}</p>
                              <span className="text-xs bg-blue-bg text-primary px-2 py-0.5 rounded-full font-medium">Qarzga olingan</span>
                            </div>
                            <p className="text-xs text-text-sub mt-1">{flowersSummary(it.flowers)}</p>
                            <p className="text-xs text-text-sub/60 mt-0.5">To'landi: {soat(it.paidAt || it.createdAt)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold text-cgreen">{money(it.totalPrice)}</p>
                            <p className="text-xs text-text-sub">so'm</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <SafeImg src={it.flowerPhoto} className="h-28 w-full rounded-xl" />
                          <SafeImg src={it.buyer?.photo} className="h-28 w-full rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : tab === 'qarz' ? (
        <>
          {/* Qarz summary */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-ccard border border-cborder rounded-2xl p-3 text-center">
              <p className="text-[11px] text-text-sub">Umumiy qarz</p>
              <p className="text-sm font-bold text-ctext mt-1">{money(qarzSum.totalQarz)}</p>
            </div>
            <div className="bg-green-bg border border-cgreen/20 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-cgreen/80">To'langan</p>
              <p className="text-sm font-bold text-cgreen mt-1">{money(qarzSum.totalPaid)}</p>
            </div>
            <div className="bg-orange-bg border border-corange/20 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-corange/80">Qoldiq</p>
              <p className="text-sm font-bold text-corange mt-1">{money(qarzSum.qoldiq)}</p>
            </div>
          </div>

          {qarzlar.length === 0 ? <EmptyState text="Hozircha qarz yo'q" /> : (
            <>
              {openQarz.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-text-sub uppercase tracking-wider px-1 pb-2">Ochiq qarzlar</p>
                  {openQarz.map(q => <QarzCard key={q._id} q={q} onPay={setPayQarz} />)}
                </div>
              )}
              {paidQarz.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-text-sub uppercase tracking-wider px-1 pb-2">Yopilgan qarzlar</p>
                  {paidQarz.map(q => <QarzCard key={q._id} q={q} onPay={setPayQarz} />)}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        atxodlar.length === 0 ? <EmptyState text="Hozircha atxod yo'q" /> : (
          <div>
            {groupByDate(atxodlar).map(group => (
              <div key={group.label}>
                <p className="text-xs font-bold text-text-sub uppercase tracking-wider px-1 pt-4 pb-2 first:pt-0">
                  {group.label}
                </p>
                <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden divide-y divide-separator">
                  {group.items.map(ax => {
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
                            <p className="text-xs text-text-sub/60 mt-0.5">{soat(ax.createdAt)}</p>
                          </div>
                        </div>
                        <SafeImg src={ax.photo} className="mt-3 h-36 w-full rounded-xl" />
                        {ax.adminNote && (
                          <div className="mt-2 px-3 py-2 bg-cbg rounded-xl">
                            <p className="text-xs text-text-sub">Admin izohi: <span className="text-ctext font-medium">{ax.adminNote}</span></p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <TolovModal qarz={payQarz} onClose={() => setPayQarz(null)} onPaid={onPaid} />
    </div>
  )
}
