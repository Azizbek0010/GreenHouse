import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, ErrorMsg, PrimaryButton, OutlineButton } from '../../components/ui'
import { DeleteButton, Field, inputCls } from '../../components/AdminEdit'
import BottomModal from '../../components/BottomModal'
import FlowerTypeSelect from '../../components/FlowerTypeSelect'
import SanaTanla from '../../components/SanaTanla'
import TolovField, { tolovPayload, tolovXato } from '../../components/TolovField'
import { todayLocal } from '../../lib/date'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }
const raqam = s => s.replace(/[\s\D]/g, '')

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
    const d = todayLocal(new Date(sv.createdAt))
    setForm({
      flowerType:    sv.flowerType,
      razmer:        String(sv.razmer),
      qty:           String(sv.qty),
      holat:         sv.holat,
      pricePerUnit:  String(sv.pricePerUnit),
      discountPrice: sv.discountPrice != null ? String(sv.discountPrice) : '',
      sana:          d,
      origSana:      d,
      // To'lov: yozuvdagi holat. Eski yozuvda usul yo'q (noma'lum) — o'sha holda
      // admin tegmasa hech narsa yuborilmaydi, "noma'lum" bo'lib qolaveradi.
      tolov: {
        aralash: sv.tolov === 'aralash',
        usul:    sv.tolov === 'karta' ? 'karta' : 'naqt',
        naqt:    sv.naqtSumma  || 0,
        karta:   sv.kartaSumma || 0,
      },
      tolovBor:     sv.tolov != null,   // yozuvda usul bormi
      tolovTegildi: false,              // admin to'lovni o'zgartirdimi
    })
    setEditOpen(true)
  }

  async function handleSave() {
    // Aralash to'lovda summalar jamiga aynan teng kelishi shart: sotuv to'liq
    // to'langan yozuv, unda "qoldiq" bo'lishi mumkin emas (qoldiq — bu qarz).
    if (form.tolov.aralash) {
      const x = tolovXato(jamiSumma, form.tolov, { qarzRuxsat: false })
      if (x) return setError(x)
    }
    setSaving(true); setError('')
    try {
      const updated = await api.patch(`/api/sotuv/${id}`, {
        flowerType:    form.flowerType,
        razmer:        Number(form.razmer),
        qty:           Number(form.qty),
        holat:         form.holat,
        pricePerUnit:  Number(form.pricePerUnit),
        discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
        // To'lovni faqat admin tegsa yoki yozuvda usul allaqachon bor bo'lsa
        // yuboramiz. Aks holda "noma'lum" eski yozuv jimgina naqd bo'lib qolardi.
        ...(form.tolovTegildi || form.tolovBor ? tolovPayload(jamiSumma, form.tolov) : {}),
        // Sana faqat o'zgargan bo'lsa
        ...(form.sana !== form.origSana ? { sana: form.sana } : {}),
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

  // Yakuniy summa — pre('save') dagi hisob bilan bir xil bo'lishi shart,
  // to'lov bo'linishi shu songa tekshiriladi
  const jamiSumma = !form ? 0
    : form.discountPrice !== ''
      ? Number(form.discountPrice)
      : Number(form.pricePerUnit || 0) * Number(form.qty || 0)

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
            <Field label="Sotuv sanasi">
              <SanaTanla value={form.sana} onChange={v => setForm(f => ({ ...f, sana: v }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Narx (1 ta, so'm)">
                <input type="text" inputMode="numeric" value={fmtInput(form.pricePerUnit)}
                  onChange={e => setForm(f => ({ ...f, pricePerUnit: raqam(e.target.value) }))} className={inputCls} />
              </Field>
              <Field label="Chegirma bilan (ixtiyoriy)">
                <input type="text" inputMode="numeric" value={fmtInput(form.discountPrice)} placeholder="Bo'sh = chegirmasiz"
                  onChange={e => setForm(f => ({ ...f, discountPrice: raqam(e.target.value) }))} className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-text-sub">
              Jami: <span className="font-semibold text-ctext">{money(jamiSumma)} so'm</span>
            </p>

            {/* To'lov. Aralash sotuvda narx/soni o'zgarsa summalarni qaytadan
                kiritish kerak — backend ham shuni talab qiladi, chunki kassaga
                qancha naqd va qancha karta tushgani haqiqiy fakt, uni
                proporsiya bilan to'qib bo'lmaydi. */}
            <TolovField
              jami={jamiSumma}
              value={form.tolov}
              onChange={v => setForm(f => ({ ...f, tolov: v, tolovTegildi: true }))}
              qoldiqMatn="To'lanmagan qoldiq"
              label="To'lov usuli"
            />

            <PrimaryButton title="Saqlash" onClick={handleSave} loading={saving} />
          </div>
        )}
      </BottomModal>
    </div>
  )
}
