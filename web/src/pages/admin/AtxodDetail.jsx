import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Clock, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, ErrorMsg, PrimaryButton, OutlineButton } from '../../components/ui'
import { DeleteButton, Field, inputCls } from '../../components/AdminEdit'
import BottomModal from '../../components/BottomModal'
import FlowerTypeSelect from '../../components/FlowerTypeSelect'
import SanaTanla from '../../components/SanaTanla'
import { sanaSoat, todayLocal } from '../../lib/date'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }
const raqam = s => s.replace(/[\s\D]/g, '')

const SABABLAR = ["so'lgan", 'nuqsonli', 'singan', 'boshqa']
const SABAB_LABEL = { "so'lgan": "So'lgan", nuqsonli: 'Nuqsonli', singan: 'Singan', boshqa: 'Boshqa' }

function StatusBadge({ status }) {
  if (status === 'approved') return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-cgreen bg-green-bg px-3 py-1 rounded-full">
      <CheckCircle size={14} /> Tasdiqlandi
    </span>
  )
  if (status === 'rejected') return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-cred bg-red-bg px-3 py-1 rounded-full">
      <XCircle size={14} /> Rad etildi
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-corange bg-orange-bg px-3 py-1 rounded-full">
      <Clock size={14} /> Kutilmoqda
    </span>
  )
}

export default function AtxodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ax, setAx]           = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    api.get(`/api/atxod/${id}`)
      .then(setAx)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function openEdit() {
    const d = todayLocal(new Date(ax.createdAt))
    setForm({
      flowerType: ax.flowerType,
      razmer:     String(ax.razmer),
      qty:        String(ax.qty),
      sabab:      ax.sabab,
      qiymat:     String(ax.qiymat),
      status:     ax.status,
      adminNote:  ax.adminNote || '',
      sana:       d,
      origSana:   d,
    })
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const updated = await api.patch(`/api/atxod/${id}`, {
        flowerType: form.flowerType,
        razmer:     Number(form.razmer),
        qty:        Number(form.qty),
        sabab:      form.sabab,
        qiymat:     Number(form.qiymat),
        status:     form.status,
        adminNote:  form.adminNote.trim() || null,
        ...(form.sana !== form.origSana ? { sana: form.sana } : {}),
      })
      setAx(updated)
      setEditOpen(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // Tasdiqlash / rad etish — ro'yxatda bor edi, bu sahifada tushib qolgan edi
  async function review(status) {
    setReviewing(true); setError('')
    try {
      setAx(await api.patch(`/api/atxod/${id}/review`, { status }))
    } catch (e) { setError(e.message) }
    finally { setReviewing(false) }
  }

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await api.del(`/api/atxod/${id}`)
      navigate(-1)
    } catch (e) { setError(e.message); setDeleting(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline">
        <ArrowLeft size={16} /> Ortga
      </button>

      {loading ? <Spinner /> : (
        <>
          <ErrorMsg msg={error} onClose={() => setError('')} />

          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-ctext tracking-tight">
              {ax?.flowerType} {ax?.razmer}sm
            </h1>
            <StatusBadge status={ax?.status} />
          </div>

          {ax && (
            <>
              <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
                {[
                  { label: 'Kassa',   value: ax.kassa?.name || '—' },
                  { label: 'Soni',    value: `${ax.qty} ta` },
                  { label: 'Qiymat',  value: `${money(ax.qiymat)} so'm` },
                  { label: "Yo'qotish (jami)", value: `${money(ax.qiymat * ax.qty)} so'm` },
                  { label: 'Sabab',   value: SABAB_LABEL[ax.sabab] || ax.sabab || '—' },
                  { label: 'Sana',    value: sanaSoat(ax.createdAt) },
                  ...(ax.adminNote ? [{ label: 'Admin izohi', value: ax.adminNote }] : []),
                ].map(({ label, value }, i) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
                    <span className="text-sm text-text-sub">{label}</span>
                    <span className="text-sm font-semibold text-ctext text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>

              {/* Kutilayotgan atxod — shu yerdan tasdiqlanadi yoki rad etiladi */}
              {ax.status === 'pending' && (
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => review('approved')}
                    disabled={reviewing}
                    className="flex-1 h-12 rounded-xl bg-cgreen text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} /> Tasdiqlash
                  </button>
                  <button
                    onClick={() => review('rejected')}
                    disabled={reviewing}
                    className="flex-1 h-12 rounded-xl border-[1.5px] border-cred text-cred bg-ccard text-base font-semibold hover:bg-red-bg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Rad etish
                  </button>
                </div>
              )}

              {/* Admin: tahrirlash / o'chirish */}
              <div className="space-y-3">
                <OutlineButton title="Tahrirlash" icon={<Pencil size={17} />} onClick={openEdit} />
                <DeleteButton onConfirm={handleDelete} loading={deleting} label="Atxodni o'chirish" />
              </div>
            </>
          )}
        </>
      )}

      <BottomModal open={editOpen} onClose={() => setEditOpen(false)} title="Atxodni tahrirlash">
        {form && (
          <div className="px-5 pt-4 space-y-3">
            <Field label="Gul turi">
              <FlowerTypeSelect boxed value={form.flowerType} onChange={v => setForm(f => ({ ...f, flowerType: v }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Razmer (sm)">
                <input type="text" inputMode="numeric" value={form.razmer}
                  onChange={e => setForm(f => ({ ...f, razmer: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
              </Field>
              <Field label="Soni">
                <input type="text" inputMode="numeric" value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sabab">
                <select value={form.sabab} onChange={set('sabab')} className={inputCls}>
                  {SABABLAR.map(s => <option key={s} value={s}>{SABAB_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Qiymat (1 ta, so'm)">
                <input type="text" inputMode="numeric" value={fmtInput(form.qiymat)}
                  onChange={e => setForm(f => ({ ...f, qiymat: raqam(e.target.value) }))} className={inputCls} />
              </Field>
            </div>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputCls}>
                <option value="pending">Kutilmoqda</option>
                <option value="approved">Tasdiqlandi</option>
                <option value="rejected">Rad etildi</option>
              </select>
            </Field>
            <Field label="Sana">
              <SanaTanla value={form.sana} onChange={v => setForm(f => ({ ...f, sana: v }))} />
            </Field>
            <Field label="Admin izohi (ixtiyoriy)">
              <input value={form.adminNote} onChange={set('adminNote')} className={inputCls} />
            </Field>
            <PrimaryButton title="Saqlash" onClick={handleSave} loading={saving} />
          </div>
        )}
      </BottomModal>
    </div>
  )
}
