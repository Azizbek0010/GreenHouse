import { useState, useEffect, useCallback } from 'react'
import { Lock, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, EmptyState, ErrorMsg, Badge } from '../../components/ui'
import { soat, groupByDate } from '../../lib/date'

function formatBatchId(id = '') {
  return id.replace(/^BATCH-/, 'PARTIYA-')
}

function FlowerSummary({ p }) {
  // YANGI rejim: faqat umumiy son
  if (p.sentTotal != null) {
    return <p className="text-xs text-text-sub mt-1">Jami {p.sentTotal} ta</p>
  }
  const sent = p.sent || []
  const total = sent.reduce((s, f) => s + f.sizes.reduce((ss, x) => ss + x.qty, 0), 0)
  if (total === 0) return null
  return (
    <p className="text-xs text-text-sub mt-1">
      {sent.map(f => `${f.type} (${f.sizes.reduce((s,x)=>s+x.qty,0)} ta)`).join(', ')} · Jami {total} ta
    </p>
  )
}

function PartiyaCard({ p }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-ctext">{formatBatchId(p.batchId)}</p>
            <Badge status={p.status} />
          </div>
          <p className="text-xs text-text-sub mt-0.5">{p.kassa?.name || 'Kassa'}</p>
          <FlowerSummary p={p} />
          <p className="text-xs text-text-sub/60 mt-1">{soat(p.createdAt)}</p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-text-sub shrink-0" />
          : <ChevronDown size={16} className="text-text-sub shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-separator">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Yuborilgan gullar</p>
            {p.sentTotal != null ? (
              <div className="bg-cbg rounded-xl px-3 py-3 text-center">
                <p className="text-2xl font-bold text-ctext">{p.sentTotal} <span className="text-base font-medium text-text-sub">ta</span></p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeplitsaTarix() {
  const [partiyalar, setPartiyalar] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await api.get('/api/partiya')
      setPartiyalar(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const counts = {
    yolda:         partiyalar.filter(p => p.status === 'yolda').length,
    qabul_qilindi: partiyalar.filter(p => p.status === 'qabul_qilindi').length,
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Package size={22} className="text-primary" />
        <h1 className="text-2xl font-bold text-ctext tracking-tight flex-1">Yuborilgan partiyalar</h1>
        <div className="flex items-center gap-1.5 text-xs text-text-sub bg-cbg border border-cborder rounded-lg px-2.5 py-1.5">
          <Lock size={11} />
          Faqat ko'rish
        </div>
      </div>

      {partiyalar.length > 0 && (
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-blue-bg border border-primary/20 rounded-xl px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-primary">{partiyalar.length}</p>
            <p className="text-xs text-primary/70">Jami partiya</p>
          </div>
          {counts.yolda > 0 && (
            <div className="flex-1 bg-orange-bg border border-corange/20 rounded-xl px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-corange">{counts.yolda}</p>
              <p className="text-xs text-corange/70">Yo'lda</p>
            </div>
          )}
          <div className="flex-1 bg-green-bg border border-cgreen/20 rounded-xl px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-cgreen">{counts.qabul_qilindi}</p>
            <p className="text-xs text-cgreen/70">Qabul qilindi</p>
          </div>
        </div>
      )}

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : partiyalar.length === 0 ? (
        <EmptyState text="Hozircha yuborilgan partiya yo'q" />
      ) : (
        <div>
          {groupByDate(partiyalar).map((group, gi) => (
            <div key={group.label}>
              <p className={`text-xs font-bold text-text-sub uppercase tracking-wider px-1 pb-2 ${gi === 0 ? 'pt-1' : 'pt-6'}`}>
                {group.label}
              </p>
              {group.items.map(p => <PartiyaCard key={p._id} p={p} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
