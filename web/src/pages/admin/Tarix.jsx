import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Package, RefreshCw, ChevronDown, ChevronUp, HandCoins, Phone, Search, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge, Spinner, EmptyState, ErrorMsg } from '../../components/ui'
import QarzEditModal from '../../components/QarzEditModal'

// ── Helpers ──────────────────────────────────────────────────────────
const UZ_MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr']

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function formatBatchId(id = '') { return id.replace(/^BATCH-/, 'PARTIYA-') }
function soat(d) { return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
function kunOldin(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days <= 0) return 'Bugun'
  if (days === 1) return 'Kecha'
  return `${days} kun oldin`
}
// Qarzlarni ism/telefon bo'yicha qidirish + saralash
function filterSortQarz(list, search, sort) {
  const q = search.trim().toLowerCase()
  const qDigits = search.replace(/\D/g, '')
  let filtered = list
  if (q) {
    filtered = list.filter(x => {
      const name  = (x.buyer?.name  || '').toLowerCase()
      const phone = (x.buyer?.phone || '')
      return name.includes(q) || (qDigits && phone.replace(/\D/g, '').includes(qDigits))
    })
  }
  const sorted = [...filtered]
  const qoldiq = x => x.totalPrice - x.paidAmount
  if (sort === 'eski')      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  else if (sort === 'kop')  sorted.sort((a, b) => qoldiq(b) - qoldiq(a))
  else if (sort === 'kam')  sorted.sort((a, b) => qoldiq(a) - qoldiq(b))
  else                      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return sorted
}
function QarzSearchSort({ search, onSearch, sort, onSort }) {
  return (
    <div className="flex gap-2 mb-3">
      <div className="flex-1 flex items-center gap-2 bg-ccard border border-cborder rounded-xl px-3 h-10">
        <Search size={14} className="text-text-sub shrink-0" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Ism yoki telefon bo'yicha qidirish"
          className="flex-1 bg-transparent text-sm text-ctext outline-none min-w-0"
        />
      </div>
      <select
        value={sort}
        onChange={e => onSort(e.target.value)}
        className="h-10 px-2.5 rounded-xl border border-cborder bg-ccard text-xs text-ctext outline-none shrink-0"
      >
        <option value="yangi">Yangi qarzlar</option>
        <option value="eski">Eski (uzoq kutilmoqda)</option>
        <option value="kop">Ko'p qarzdor</option>
        <option value="kam">Kam qarzdor</option>
      </select>
    </div>
  )
}
function dateKey(d) { const dt = new Date(d); return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}` }
function dateLabel(d) {
  const dt = new Date(d), today = new Date(), yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (dateKey(dt) === dateKey(today))     return 'Bugun'
  if (dateKey(dt) === dateKey(yesterday)) return 'Kecha'
  return `${dt.getDate()} ${UZ_MONTHS[dt.getMonth()]}`
}
function groupByDate(items, totalKey) {
  const groups = [], seen = {}
  for (const item of items) {
    const key = dateKey(item.createdAt)
    if (!seen[key]) {
      seen[key] = { label: dateLabel(item.createdAt), items: [], total: 0 }
      groups.push(seen[key])
    }
    seen[key].items.push(item)
    if (totalKey) seen[key].total += item[totalKey] || 0
  }
  return groups
}

function DateHeader({ label, right, first }) {
  return (
    <div className={`flex items-center gap-3 pb-2 ${first ? 'pt-0' : 'pt-5'}`}>
      <p className="text-xs font-bold text-text-sub uppercase tracking-wider whitespace-nowrap">{label}</p>
      <div className="flex-1 h-px bg-cborder" />
      {right && <p className="text-xs font-semibold text-cgreen whitespace-nowrap">{right}</p>}
    </div>
  )
}

const SABAB_EMOJI  = { "so'lgan": '🥀', nuqsonli: '⚠️', singan: '💔', boshqa: '📦' }
const SABAB_LABEL  = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }
const STATUS_CLS   = { pending: 'bg-orange-bg text-corange', approved: 'bg-green-bg text-cgreen', rejected: 'bg-red-bg text-cred' }
const STATUS_LABEL = { pending: 'Kutilmoqda', approved: 'Tasdiqlandi', rejected: 'Rad etildi' }

// ── Sotuvlar tab ──────────────────────────────────────────────────────
function SotuvlarTab({ list }) {
  const navigate = useNavigate()
  const total   = list.reduce((s, x) => s + x.totalPrice, 0)
  const byKassa = [...new Set(list.map(s => s.kassa?.name).filter(Boolean))]
  const [kassaF, setKassaF] = useState('hammasi')

  const shown = kassaF === 'hammasi' ? list : list.filter(s => s.kassa?.name === kassaF)

  return (
    <>
      {/* Total banner */}
      <div className="bg-primary-dk rounded-2xl p-4 flex items-center justify-between mb-4 text-white">
        <div>
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Umumiy tushum</p>
          <p className="text-xs text-white/50 mt-0.5">{list.length} ta sotuv</p>
        </div>
        <p className="text-2xl font-bold">{money(total)} <span className="text-sm font-normal text-white/60">so'm</span></p>
      </div>

      {/* Kassa filter */}
      {byKassa.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {['hammasi', ...byKassa].map(k => (
            <button key={k} onClick={() => setKassaF(k)}
              className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors ${
                kassaF === k ? 'bg-primary text-white border-primary' : 'bg-ccard text-text-sub border-cborder hover:border-primary'
              }`}
            >
              {k === 'hammasi' ? 'Hammasi' : k}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? <EmptyState text="Sotuv yo'q" /> : (
        <div>
          {groupByDate(shown, 'totalPrice').map((group, gi) => (
            <div key={group.label}>
              <DateHeader label={group.label} right={`${money(group.total)} so'm`} first={gi === 0} />
              <div className="space-y-3">
                {group.items.map(sv => (
                  <button key={sv._id} onClick={() => navigate(`/admin/sotuv/${sv._id}`)}
                    className="w-full bg-ccard border border-cborder rounded-2xl overflow-hidden text-left hover:border-primary transition-colors">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-base font-semibold text-ctext">{sv.flowerType} {sv.razmer}sm</p>
                            {sv.holat === 'nuqsonli' && (
                              <span className="text-xs bg-orange-bg text-corange px-2 py-0.5 rounded-full font-semibold">Nuqsonli</span>
                            )}
                          </div>
                          <p className="text-sm text-text-sub">{sv.qty} ta × {money(sv.pricePerUnit)} so'm · {sv.kassa?.name || 'Kassa'}</p>
                          <p className="text-xs text-text-sub/60 mt-1">{soat(sv.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold ${sv.holat === 'nuqsonli' ? 'text-corange' : 'text-cgreen'}`}>
                            {money(sv.totalPrice)}
                          </p>
                          <p className="text-xs text-text-sub">so'm</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Atxodlar tab ──────────────────────────────────────────────────────
function AtxodlarTab({ list }) {
  const navigate = useNavigate()
  const [statusF, setStatusF] = useState('hammasi')

  const shown  = statusF === 'hammasi' ? list : list.filter(a => a.status === statusF)
  const counts = { hammasi: list.length, pending: 0, approved: 0, rejected: 0 }
  list.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        {['hammasi', 'pending', 'approved', 'rejected'].map(k => (
          <button key={k} onClick={() => setStatusF(k)}
            className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              statusF === k ? 'bg-primary text-white border-primary' : 'bg-ccard text-text-sub border-cborder hover:border-primary'
            }`}
          >
            {k === 'hammasi' ? 'Hammasi' : STATUS_LABEL[k]}
            <span className={`min-w-[18px] text-xs font-bold px-1 rounded-full flex items-center justify-center ${
              statusF === k ? 'bg-white/20 text-white' : 'bg-cbg text-text-sub'
            }`}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? <EmptyState text="Atxod yo'q" /> : (
        <div>
          {groupByDate(shown).map((group, gi) => (
            <div key={group.label}>
              <DateHeader label={group.label} first={gi === 0} />
              <div className="space-y-3">
                {group.items.map(a => (
                  <button key={a._id} onClick={() => navigate(`/admin/atxod/${a._id}`)}
                    className="w-full bg-ccard border border-cborder rounded-2xl overflow-hidden text-left hover:border-primary transition-colors">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-base font-semibold text-ctext">{a.flowerType} · {a.razmer}sm</p>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_CLS[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </div>
                      <p className="text-sm text-text-sub">
                        {a.qty} ta · {SABAB_EMOJI[a.sabab] || ''} {SABAB_LABEL[a.sabab] || a.sabab} · {a.kassa?.name || 'Kassa'}
                      </p>
                      {a.qiymat > 0 && (
                        <p className="text-sm text-cred mt-0.5">Yo'qotish: {money(a.qiymat * a.qty)} so'm</p>
                      )}
                      <p className="text-xs text-text-sub/60 mt-1">{soat(a.createdAt)}</p>
                      {a.adminNote && (
                        <div className="mt-2 px-3 py-2 bg-cbg rounded-xl">
                          <p className="text-xs text-text-sub">Admin izohi: <span className="text-ctext font-medium">{a.adminNote}</span></p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Qarzdorliklar tab ─────────────────────────────────────────────────
function qarzFlowers(flowers = []) {
  return flowers.map(f => `${f.type} ${f.razmer}sm · ${f.qty} ta`).join(', ')
}

function QarzlarTab({ list, sum, onChanged }) {
  const [kassaF, setKassaF] = useState('hammasi')
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState('yangi')
  const [editing, setEditing] = useState(null)   // admin tahrirlash uchun tanlangan qarz
  const byKassa = [...new Set(list.map(q => q.kassa?.name).filter(Boolean))]
  const kassaFiltered = kassaF === 'hammasi' ? list : list.filter(q => q.kassa?.name === kassaF)
  const shown = filterSortQarz(kassaFiltered, search, sort)
  const open  = shown.filter(q => !q.isPaid)
  const paid  = shown.filter(q => q.isPaid)

  const Card = ({ q }) => {
    const remaining = q.totalPrice - q.paidAmount
    const pct = q.totalPrice > 0 ? Math.min(100, Math.round((q.paidAmount / q.totalPrice) * 100)) : 0
    return (
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold text-ctext">{q.buyer?.name}</p>
              {q.isPaid
                ? <span className="text-xs bg-green-bg text-cgreen px-2 py-0.5 rounded-full font-semibold">To'landi</span>
                : <span className="text-xs bg-orange-bg text-corange px-2 py-0.5 rounded-full font-semibold">Qarzdor</span>}
            </div>
            <div className="flex items-start gap-2 shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-ctext">{money(q.totalPrice)}</p>
                <p className="text-xs text-text-sub">so'm</p>
              </div>
              <button onClick={() => setEditing(q)}
                className="text-text-sub hover:text-primary p-1.5 hover:bg-cbg rounded-lg transition-colors"
                title="Tahrirlash">
                <Pencil size={15} />
              </button>
            </div>
          </div>
          <a href={`tel:${q.buyer?.phone}`} className="text-sm text-primary flex items-center gap-1">
            <Phone size={12} /> {q.buyer?.phone}
          </a>
          <p className="text-sm text-text-sub mt-1">{qarzFlowers(q.flowers)}</p>
          <p className="text-xs text-text-sub/60 mt-1">
            {q.kassa?.name || 'Kassa'} · {soat(q.createdAt)}{!q.isPaid ? ` · ${kunOldin(q.createdAt)}` : ''}
          </p>

          {!q.isPaid && q.paidAmount > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-cbg rounded-full overflow-hidden">
                <div className="h-full bg-cgreen" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-cgreen">To'landi: {money(q.paidAmount)}</span>
                <span className="text-xs text-corange">Qoldiq: {money(remaining)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-ccard border border-cborder rounded-2xl p-3 text-center">
          <p className="text-[11px] text-text-sub">Umumiy qarz</p>
          <p className="text-sm font-bold text-ctext mt-1">{money(sum.totalQarz)}</p>
        </div>
        <div className="bg-green-bg border border-cgreen/20 rounded-2xl p-3 text-center">
          <p className="text-[11px] text-cgreen/80">To'langan</p>
          <p className="text-sm font-bold text-cgreen mt-1">{money(sum.totalPaid)}</p>
        </div>
        <div className="bg-orange-bg border border-corange/20 rounded-2xl p-3 text-center">
          <p className="text-[11px] text-corange/80">Qoldiq</p>
          <p className="text-sm font-bold text-corange mt-1">{money(sum.qoldiq)}</p>
        </div>
      </div>

      {byKassa.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {['hammasi', ...byKassa].map(k => (
            <button key={k} onClick={() => setKassaF(k)}
              className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors ${
                kassaF === k ? 'bg-primary text-white border-primary' : 'bg-ccard text-text-sub border-cborder hover:border-primary'
              }`}
            >
              {k === 'hammasi' ? 'Hammasi' : k}
            </button>
          ))}
        </div>
      )}

      {list.length > 0 && (
        <QarzSearchSort search={search} onSearch={setSearch} sort={sort} onSort={setSort} />
      )}

      {list.length === 0 ? <EmptyState text="Qarz yo'q" /> : shown.length === 0 ? (
        <EmptyState text="Qidiruv bo'yicha hech narsa topilmadi" />
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <div>
              <DateHeader label="Ochiq qarzlar" right={`${open.length} ta`} first />
              <div className="space-y-3">{open.map(q => <Card key={q._id} q={q} />)}</div>
            </div>
          )}
          {paid.length > 0 && (
            <div>
              <DateHeader label="Yopilgan qarzlar" right={`${paid.length} ta`} />
              <div className="space-y-3">{paid.map(q => <Card key={q._id} q={q} />)}</div>
            </div>
          )}
        </div>
      )}

      <QarzEditModal
        qarz={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => onChanged?.()}
        onDeleted={() => onChanged?.()}
      />
    </>
  )
}

// ── Partiyalar tab ────────────────────────────────────────────────────
function summarize(p) {
  if (p.sentTotal != null) return `${p.sentTotal} ta`
  return (p.sent || []).map(f => `${f.type} (${f.sizes.reduce((s, x) => s + x.qty, 0)} ta)`).join(', ')
}

function PartiyaCard({ p }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden hover:border-primary transition-colors cursor-pointer"
      onClick={() => navigate(`/admin/farq/${p._id}`)}>
      <div className="p-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-semibold text-ctext">{formatBatchId(p.batchId)}</p>
          <Badge status={p.status} />
        </div>
        <p className="text-sm text-text-sub">{p.teplitsa?.name || 'Teplitsa'} → {p.kassa?.name || 'Kassa'}</p>
        <p className="text-xs text-text-sub mt-0.5">{summarize(p)}</p>
        <p className="text-xs text-text-sub/60 mt-1">{soat(p.createdAt)}</p>

        {/* Развернуть детали */}
        <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="flex items-center gap-1 text-xs text-primary font-semibold mt-3 hover:underline"
        >
          {expanded ? <><ChevronUp size={13} /> Yopish</> : <><ChevronDown size={13} /> Gullar</>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-separator px-4 py-3 space-y-2">
          {p.sentTotal != null ? (
            <div className="bg-cbg rounded-xl px-3 py-2.5 flex items-center justify-between">
              <span className="text-sm text-text-sub">Yuborilgan</span>
              <span className="text-sm font-bold text-ctext">{p.sentTotal} ta</span>
            </div>
          ) : (p.sent || []).map((f, i) => (
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
          {p.sentTotal != null && p.farqSoni != null && p.farqSoni !== 0 && (
            <div className="flex items-center justify-between bg-red-bg/40 border border-cred/20 rounded-xl px-3 py-2">
              <span className="text-xs text-ctext font-medium">Farq (soni)</span>
              <span className="text-xs text-cred font-semibold">{p.farqSoni > 0 ? '+' : ''}{p.farqSoni} ta</span>
            </div>
          )}
          {p.farq && p.farq.length > 0 && (
            <>
              <p className="text-xs font-semibold text-cred uppercase tracking-wider pt-1">Farqlar</p>
              {p.farq.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-red-bg/40 border border-cred/20 rounded-xl px-3 py-2">
                  <span className="text-xs text-ctext font-medium">{f.type} {f.sm}sm</span>
                  <span className="text-xs text-cred font-semibold">
                    {f.sent} → {f.received} ({f.diff > 0 ? '+' : ''}{f.diff})
                  </span>
                </div>
              ))}
            </>
          )}
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
          <button key={f.key} onClick={() => setStatusF(f.key)}
            className={`h-8 px-3 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              statusF === f.key ? 'bg-primary text-white border-primary' : 'bg-ccard text-text-sub border-cborder hover:border-primary'
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
        <div>
          {groupByDate(shown).map((group, gi) => (
            <div key={group.label}>
              <DateHeader label={group.label} right={`${group.items.length} ta`} first={gi === 0} />
              <div className="space-y-3">
                {group.items.map(p => <PartiyaCard key={p._id} p={p} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'sotuv',   label: 'Sotuvlar',   icon: ShoppingCart, color: 'bg-cgreen'  },
  { key: 'qarz',    label: 'Qarzlar',    icon: HandCoins,    color: 'bg-corange' },
  { key: 'atxod',  label: 'Atxodlar',   icon: Trash2,       color: 'bg-cred'    },
  { key: 'partiya', label: 'Partiyalar', icon: Package,      color: 'bg-primary' },
]

export default function AdminTarix() {
  const [tab, setTab]               = useState('sotuv')
  const [sotuvlar, setSotuvlar]     = useState([])
  const [qarzlar, setQarzlar]       = useState([])
  const [qarzSum, setQarzSum]       = useState({ totalQarz: 0, totalPaid: 0, qoldiq: 0 })
  const [atxodlar, setAtxodlar]     = useState([])
  const [partiyalar, setPartiyalar] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [sv, qz, ax, pt] = await Promise.all([
        api.get('/api/sotuv'),
        api.get('/api/qarz'),
        api.get('/api/atxod'),
        api.get('/api/partiya'),
      ])
      setSotuvlar(sv.sotuvlar || [])
      setQarzlar(qz.qarzlar || [])
      setQarzSum({ totalQarz: qz.totalQarz || 0, totalPaid: qz.totalPaid || 0, qoldiq: qz.qoldiq || 0 })
      setAtxodlar(ax || [])
      setPartiyalar(pt || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const counts = { sotuv: sotuvlar.length, qarz: qarzlar.filter(q => !q.isPaid).length, atxod: atxodlar.length, partiya: partiyalar.length }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Umumiy tarix</h1>
        <button onClick={load} className="p-2 rounded-xl hover:bg-cbg text-text-sub hover:text-ctext transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#e9ebee] dark:bg-gray-800 rounded-xl p-1 mb-5">
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                active ? `${t.color} text-white shadow-sm` : 'text-text-sub hover:text-ctext'
              }`}
            >
              <Icon size={13} />
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-xs font-bold px-1.5 rounded-full ${
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
          {tab === 'sotuv'   && <SotuvlarTab  list={sotuvlar}   />}
          {tab === 'qarz'    && <QarzlarTab   list={qarzlar} sum={qarzSum} onChanged={load} />}
          {tab === 'atxod'   && <AtxodlarTab  list={atxodlar}   />}
          {tab === 'partiya' && <PartiyalarTab list={partiyalar} />}
        </>
      )}
    </div>
  )
}
