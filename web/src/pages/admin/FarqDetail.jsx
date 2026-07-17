import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle, AlertCircle, ShieldCheck, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge, Spinner, ErrorMsg, PrimaryButton, OutlineButton } from '../../components/ui'
import { DeleteButton } from '../../components/AdminEdit'
import BottomModal from '../../components/BottomModal'
import FlowerListEditor from '../../components/FlowerListEditor'

function formatBatchId(id = '') { return id.replace(/^BATCH-/, 'PARTIYA-') }
function buildRows(sent = [], received = []) {
  const map = new Map()
  const key = (t, s) => `${t}|${s}`
  for (const f of sent) for (const s of f.sizes)
    map.set(key(f.type, s.sm), { type: f.type, sm: s.sm, sent: s.qty, received: 0 })
  for (const f of received) for (const s of f.sizes) {
    const k = key(f.type, s.sm); const ex = map.get(k)
    if (ex) ex.received = s.qty
    else map.set(k, { type: f.type, sm: s.sm, sent: 0, received: s.qty })
  }
  return [...map.values()]
    .map(r => ({ ...r, diff: r.received - r.sent }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.sm - b.sm)
}

export default function FarqDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [p, setP]             = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [confirming, setConfirming] = useState(false)

  // Admin edit/delete
  const [editOpen, setEditOpen]       = useState(false)
  const [editSent, setEditSent]       = useState([])
  const [editReceived, setEditReceived] = useState([])
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)

  function openEdit() {
    setEditSent(JSON.parse(JSON.stringify(p.sent || [])))
    setEditReceived(JSON.parse(JSON.stringify(p.received || [])))
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const body = { sent: editSent }
      if (p.status !== 'yolda') body.received = editReceived
      const updated = await api.patch(`/api/partiya/${id}`, body)
      setP(updated)
      setEditOpen(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await api.del(`/api/partiya/${id}`)
      navigate(-1)
    } catch (e) { setError(e.message); setDeleting(false) }
  }

  async function handleConfirm() {
    setConfirming(true)
    try {
      const updated = await api.patch(`/api/partiya/${id}/confirm-farq`)
      setP(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirming(false)
    }
  }

  useEffect(() => {
    api.get(`/api/partiya/${id}`)
      .then(setP)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const rows    = p ? buildRows(p.sent, p.received) : []
  const hasFarq = rows.some(r => r.diff !== 0)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline"
      >
        <ArrowLeft size={16} /> Ortga
      </button>

      {loading ? <Spinner /> : (
        <>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-ctext tracking-tight">{formatBatchId(p?.batchId || 'Partiya')}</h1>
            {p && <Badge status={p.status} />}
          </div>

          <ErrorMsg msg={error} onClose={() => setError('')} />

          {/* Info card */}
          {p && (
            <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
              {[
                { label: 'Holat',    value: <Badge status={p.status} /> },
                { label: 'Teplitsa', value: p.teplitsa?.name || '—' },
                { label: 'Kassa',    value: p.kassa?.name || '—' },
                { label: 'Sana',     value: new Date(p.createdAt).toLocaleString('ru-RU') },
              ].map(({ label, value }, i) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
                  <span className="text-sm text-text-sub">{label}</span>
                  <span className="text-sm font-semibold text-ctext">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comparison table */}
          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">
            Yuborilgan / Qabul qilingan
          </p>

          {p?.status === 'yolda' ? (
            <div className="flex items-center gap-3 bg-ccard border border-cborder rounded-2xl p-4">
              <Clock size={18} className="text-primary" />
              <span className="text-sm text-text-sub">Partiya hali qabul qilinmagan</span>
            </div>
          ) : (
            <>
              <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
                <div className="flex bg-cbg border-b border-separator px-4 py-2.5">
                  <span className="flex-1 text-xs font-semibold text-text-sub uppercase tracking-wide">Gul</span>
                  <span className="w-16 text-center text-xs font-semibold text-text-sub uppercase tracking-wide">Yub.</span>
                  <span className="w-16 text-center text-xs font-semibold text-text-sub uppercase tracking-wide">Keldi</span>
                  <span className="w-16 text-center text-xs font-semibold text-text-sub uppercase tracking-wide">Farq</span>
                </div>
                {rows.map((r, i) => (
                  <div key={`${r.type}-${r.sm}`} className={`flex items-center px-4 py-3 ${i > 0 ? 'border-t border-separator' : ''}`}>
                    <span className="flex-1 text-sm font-medium text-ctext">{r.type} {r.sm}sm</span>
                    <span className="w-16 text-center text-sm text-ctext">{r.sent}</span>
                    <span className="w-16 text-center text-sm text-ctext">{r.received}</span>
                    <span className={`w-16 text-center text-sm font-bold ${
                      r.diff < 0 ? 'text-cred' : r.diff > 0 ? 'text-corange' : 'text-ctext'
                    }`}>
                      {r.diff === 0 ? '0' : r.diff > 0 ? `+${r.diff}` : r.diff}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className={`flex items-center gap-3 rounded-2xl p-4 ${hasFarq ? 'bg-red-bg' : 'bg-green-bg'}`}>
                {hasFarq
                  ? <AlertCircle size={20} className="text-cred shrink-0" />
                  : <CheckCircle size={20} className="text-cgreen shrink-0" />
                }
                <span className={`text-sm font-semibold ${hasFarq ? 'text-[#b91c1c] dark:text-red-300' : 'text-[#1a7a3c] dark:text-green-300'}`}>
                  {hasFarq
                    ? `${rows.filter(r => r.diff !== 0).length} ta pozitsiyada farq bor`
                    : "Hammasi to'g'ri keldi"
                  }
                </span>
              </div>

              {/* Подтверждение farq — только если статус farq_bor */}
              {p?.status === 'farq_bor' && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 mt-4"
                >
                  <ShieldCheck size={18} />
                  {confirming ? 'Tasdiqlanmoqda...' : 'Farqni tasdiqlash'}
                </button>
              )}
            </>
          )}

          {/* Admin: tahrirlash / o'chirish */}
          {p && (
            <div className="space-y-3 mt-4">
              <OutlineButton title="Tahrirlash" icon={<Pencil size={17} />} onClick={openEdit} />
              <DeleteButton onConfirm={handleDelete} loading={deleting} label="Partiyani o'chirish" />
            </div>
          )}
        </>
      )}

      <BottomModal open={editOpen} onClose={() => setEditOpen(false)} title="Partiyani tahrirlash">
        <div className="pt-4 space-y-4">
          <FlowerListEditor flowers={editSent} onChange={setEditSent} label="Yuborilgan (Teplitsa)" />
          {p?.status !== 'yolda' && (
            <FlowerListEditor flowers={editReceived} onChange={setEditReceived} label="Qabul qilingan (Kassa)" />
          )}
          <p className="text-xs text-text-sub px-5">
            Saqlashda farq va status avtomatik qayta hisoblanadi.
          </p>
          <div className="px-5">
            <PrimaryButton title="Saqlash" onClick={handleSave} loading={saving} />
          </div>
        </div>
      </BottomModal>
    </div>
  )
}
