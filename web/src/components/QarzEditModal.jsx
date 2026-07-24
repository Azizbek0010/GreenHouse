// Admin: qarzni tahrirlash — xaridor, sana, gullar, to'lovlar
import { useState, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { api } from '../lib/api'
import BottomModal from './BottomModal'
import FlowerTypeSelect from './FlowerTypeSelect'
import { PrimaryButton, ErrorMsg } from './ui'
import { DeleteButton, Field, inputCls } from './AdminEdit'
import SanaTanla from './SanaTanla'
import { todayLocal } from '../lib/date'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
// Katta summalar o'qilishi uchun mingliklarga bo'sh joy: "70000" -> "70 000"
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }
const raqam = s => s.replace(/[\s\D]/g, '')
// Kun bo'yicha sana -> Toshkent peshini (12:00) ISO. Kun muhim, soat emas.
const kunToISO = d => new Date(`${d}T07:00:00.000Z`).toISOString()

export default function QarzEditModal({ qarz, open, onClose, onSaved, onDeleted }) {
  const [buyerName, setBuyerName]   = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [sana, setSana]             = useState('')     // sotuv sanasi (createdAt)
  const [origSana, setOrigSana]     = useState('')
  const [flowers, setFlowers]       = useState([])
  const [payments, setPayments]     = useState([])
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!open || !qarz) return
    setBuyerName(qarz.buyer?.name || '')
    setBuyerPhone(qarz.buyer?.phone || '')
    const d = todayLocal(new Date(qarz.createdAt))
    setSana(d); setOrigSana(d)
    setFlowers((qarz.flowers || []).map(f => ({
      type:          f.type,
      razmer:        String(f.razmer),
      qty:           String(f.qty),
      pricePerUnit:  String(f.pricePerUnit),
      discountPrice: f.discountPrice != null ? String(f.discountPrice) : '',
    })))
    setPayments((qarz.payments || []).map(p => ({
      amount: String(p.amount),
      at:     todayLocal(new Date(p.at)),   // kun bo'yicha (ichki kalendar)
      usul:   p.usul ?? '',                 // naqt / karta / '' (noma'lum)
    })))
    setError('')
  }, [open, qarz])

  const setFlower = (i, k, v) => setFlowers(fs => fs.map((f, idx) => idx === i ? { ...f, [k]: v } : f))
  const setPayment = (i, k, v) => setPayments(ps => ps.map((p, idx) => idx === i ? { ...p, [k]: v } : p))

  const flowerTotal = (f) => f.discountPrice !== '' ? Number(f.discountPrice) : Number(f.pricePerUnit || 0) * Number(f.qty || 0)
  const totalPrice  = flowers.reduce((s, f) => s + flowerTotal(f), 0)
  const totalPaid   = payments.reduce((s, p) => s + Number(p.amount || 0), 0)

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const updated = await api.patch(`/api/qarz/${qarz._id}`, {
        buyerName,
        buyerPhone,
        ...(sana !== origSana ? { sana } : {}),   // faqat o'zgargan bo'lsa
        flowers: flowers.map(f => ({
          type:          f.type,
          razmer:        Number(f.razmer),
          qty:           Number(f.qty),
          pricePerUnit:  Number(f.pricePerUnit),
          discountPrice: f.discountPrice === '' ? null : Number(f.discountPrice),
        })),
        payments: payments.map(p => ({ amount: Number(p.amount), at: kunToISO(p.at), usul: p.usul || null })),
      })
      onSaved(updated)
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await api.del(`/api/qarz/${qarz._id}`)
      onDeleted(qarz._id)
      onClose()
    } catch (e) { setError(e.message) }
    finally { setDeleting(false) }
  }

  return (
    <BottomModal open={open} onClose={onClose} title="Qarzni tahrirlash">
      <div className="px-5 pt-4 space-y-4">
        <ErrorMsg msg={error} onClose={() => setError('')} />

        {/* Xaridor */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Xaridor ismi">
            <input value={buyerName} onChange={e => setBuyerName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Telefon">
            <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* Sotuv sanasi — ichki kalendar */}
        <Field label="Sotuv sanasi">
          <SanaTanla value={sana} onChange={setSana} />
        </Field>

        {/* Gullar */}
        <div>
          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Gullar</p>
          <div className="space-y-3">
            {flowers.map((f, i) => (
              <div key={i} className="bg-cbg border border-cborder rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <FlowerTypeSelect boxed value={f.type} onChange={v => setFlower(i, 'type', v)} />
                  </div>
                  <button onClick={() => setFlowers(fs => fs.filter((_, idx) => idx !== i))}
                    className="text-cred p-2 hover:bg-red-bg rounded-lg shrink-0" aria-label="Gulni o'chirish">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Razmer (sm)">
                    <input type="text" inputMode="numeric" value={f.razmer}
                      onChange={e => setFlower(i, 'razmer', e.target.value.replace(/\D/g, ''))} className={inputCls} />
                  </Field>
                  <Field label="Soni">
                    <input type="text" inputMode="numeric" value={f.qty}
                      onChange={e => setFlower(i, 'qty', e.target.value.replace(/\D/g, ''))} className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Narx (1 ta)">
                    <input type="text" inputMode="numeric" value={fmtInput(f.pricePerUnit)}
                      onChange={e => setFlower(i, 'pricePerUnit', raqam(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Chegirma bilan (ixt.)">
                    <input type="text" inputMode="numeric" value={fmtInput(f.discountPrice)} placeholder="Bo'sh = yo'q"
                      onChange={e => setFlower(i, 'discountPrice', raqam(e.target.value))} className={inputCls} />
                  </Field>
                </div>
                <p className="text-xs text-text-sub">Jami: <span className="font-semibold text-ctext">{money(flowerTotal(f))} so'm</span></p>
              </div>
            ))}
            <button
              onClick={() => setFlowers(fs => [...fs, { type: '', razmer: '', qty: '', pricePerUnit: '', discountPrice: '' }])}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl border-2 border-dashed border-cborder text-text-sub text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <Plus size={15} /> Gul qo'shish
            </button>
          </div>
        </div>

        {/* To'lovlar */}
        <div>
          <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">To'lovlar</p>
          <div className="space-y-3">
            {payments.map((p, i) => (
              <div key={i} className="bg-cbg border border-cborder rounded-2xl p-3 space-y-2">
                {/* inputCls da w-full bor — flex bolalar o'rovchi div bilan boshqariladi */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <input type="text" inputMode="numeric" value={fmtInput(p.amount)} placeholder="Summa"
                      onChange={e => setPayment(i, 'amount', raqam(e.target.value))} className={inputCls} />
                  </div>
                  <div className="w-24 shrink-0">
                    <select value={p.usul} onChange={e => setPayment(i, 'usul', e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      <option value="naqt">Naqt</option>
                      <option value="karta">Karta</option>
                    </select>
                  </div>
                  <button onClick={() => setPayments(ps => ps.filter((_, idx) => idx !== i))}
                    className="text-cred p-2 hover:bg-red-bg rounded-lg shrink-0" aria-label="To'lovni o'chirish">
                    <Trash2 size={15} />
                  </button>
                </div>
                <SanaTanla value={p.at} onChange={v => setPayment(i, 'at', v)} min={sana} />
              </div>
            ))}
            <button
              onClick={() => setPayments(ps => [...ps, { amount: '', at: todayLocal(new Date()), usul: 'naqt' }])}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl border-2 border-dashed border-cborder text-text-sub text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <Plus size={15} /> To'lov qo'shish
            </button>
          </div>
        </div>

        {/* Xulosa */}
        <div className="bg-cbg rounded-xl px-3 py-2.5 flex justify-between text-sm">
          <span className="text-text-sub">Umumiy: <span className="font-semibold text-ctext">{money(totalPrice)}</span></span>
          <span className="text-text-sub">To'langan: <span className={`font-semibold ${totalPaid > totalPrice ? 'text-cred' : 'text-cgreen'}`}>{money(totalPaid)}</span></span>
        </div>
        {totalPaid > totalPrice && (
          <p className="text-xs text-cred">To'langan summa umumiy qarzdan oshib ketdi — saqlab bo'lmaydi.</p>
        )}

        <PrimaryButton title="Saqlash" onClick={handleSave} loading={saving} disabled={totalPaid > totalPrice} />

        {/* O'chirish — asosiy amaldan ajratilgan (tasodifan bosilmasin) */}
        <div className="pt-3 mt-1 border-t border-separator">
          <DeleteButton onConfirm={handleDelete} loading={deleting} label="Qarzni o'chirish" />
        </div>
      </div>
    </BottomModal>
  )
}
