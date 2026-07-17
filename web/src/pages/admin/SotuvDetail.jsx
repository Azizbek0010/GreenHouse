import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, ErrorMsg, PrimaryButton, OutlineButton } from '../../components/ui'
import { DeleteButton, Field, inputCls } from '../../components/AdminEdit'
import BottomModal from '../../components/BottomModal'
import FlowerTypeSelect from '../../components/FlowerTypeSelect'

function money(n) { return (n || 0).toLocaleString('ru-RU') }

export default function SotuvDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sv, setSv]           = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`/api/sotuv/${id}`)
      .then(setSv)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function openEdit() {
    setForm({
      flowerType:    sv.flowerType,
      razmer:        String(sv.razmer),
      qty:           String(sv.qty),
      holat:         sv.holat,
      pricePerUnit:  String(sv.pricePerUnit),
      discountPrice: sv.discountPrice != null ? String(sv.discountPrice) : '',
    })
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const updated = await api.patch(`/api/sotuv/${id}`, {
        flowerType:    form.flowerType,
        razmer:        Number(form.razmer),
        qty:           Number(form.qty),
        holat:         form.holat,
        pricePerUnit:  Number(form.pricePerUnit),
        discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
      })
      setSv(updated)
      setEditOpen(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await api.del(`/api/sotuv/${id}`)
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
              {sv?.flowerType} {sv?.razmer}sm
            </h1>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              sv?.holat === 'nuqsonli' ? 'bg-orange-bg text-corange' : 'bg-green-bg text-cgreen'
            }`}>
              {sv?.holat === 'nuqsonli' ? 'Nuqsonli' : 'Normal'}
            </span>
          </div>

          {sv && (
            <>
              <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
                {[
                  { label: 'Kassa',       value: sv.kassa?.name || '—' },
                  { label: 'Soni',        value: `${sv.qty} ta` },
                  { label: 'Narx (1 ta)', value: `${money(sv.pricePerUnit)} so'm` },
                  ...(sv.discountPrice != null ? [{ label: 'Chegirma bilan', value: `${money(sv.discountPrice)} so'm` }] : []),
                  { label: 'Jami',        value: `${money(sv.totalPrice)} so'm` },
                  { label: 'Sana',        value: new Date(sv.createdAt).toLocaleString('ru-RU') },
                ].map(({ label, value }, i) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
                    <span className="text-sm text-text-sub">{label}</span>
                    <span className="text-sm font-semibold text-ctext">{value}</span>
                  </div>
                ))}
              </div>

              {/* Admin: tahrirlash / o'chirish */}
              <div className="space-y-3">
                <OutlineButton title="Tahrirlash" icon={<Pencil size={17} />} onClick={openEdit} />
                <DeleteButton onConfirm={handleDelete} loading={deleting} label="Sotuvni o'chirish" />
              </div>
            </>
          )}
        </>
      )}

      <BottomModal open={editOpen} onClose={() => setEditOpen(false)} title="Sotuvni tahrirlash">
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
            <Field label="Holat">
              <select value={form.holat} onChange={set('holat')} className={inputCls}>
                <option value="yaxshi">Yaxshi</option>
                <option value="nuqsonli">Nuqsonli</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Narx (1 ta, so'm)">
                <input type="text" inputMode="numeric" value={form.pricePerUnit}
                  onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
              </Field>
              <Field label="Chegirma bilan (ixtiyoriy)">
                <input type="text" inputMode="numeric" value={form.discountPrice} placeholder="Bo'sh = chegirmasiz"
                  onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-text-sub">
              Jami: <span className="font-semibold text-ctext">
                {money(form.discountPrice !== '' ? Number(form.discountPrice) : Number(form.pricePerUnit || 0) * Number(form.qty || 0))} so'm
              </span>
            </p>
            <PrimaryButton title="Saqlash" onClick={handleSave} loading={saving} />
          </div>
        )}
      </BottomModal>
    </div>
  )
}
