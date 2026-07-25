import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Phone, HandCoins, Check, User } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Spinner, ErrorMsg, OutlineButton } from '../components/ui'
import { DeleteButton } from '../components/AdminEdit'
import BottomModal from '../components/BottomModal'
import QarzEditModal from '../components/QarzEditModal'
import TolovField, { TolovBadge, bushTolov, tolovXato } from '../components/TolovField'
import SanaField from '../components/SanaField'
import { sanaSoat, sanaLabel, soat, todayLocal } from '../lib/date'

function money(n) { return (n || 0).toLocaleString('ru-RU') }
function num(s)   { return parseInt(String(s).replace(/\s/g, '')) || 0 }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }
function flowerTotal(f) { return f.discountPrice != null ? f.discountPrice : f.pricePerUnit * f.qty }
function kunKutdi(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return days <= 0 ? '' : `${days} kun kutilmoqda`
}

// ── To'lov modal (faqat kassa — /tolov endpointi kassa uchun) ─────────
function TolovModal({ qarz, onClose, onPaid }) {
  const [amount, setAmount] = useState('')
  const [sana, setSana]     = useState('')
  const [usul, setUsul]     = useState(bushTolov('naqt'))
  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState('')
  if (!qarz) return null

  const remaining = qarz.totalPrice - qarz.paidAmount

  const pay = async () => {
    // Aralash rejimda summa TolovField ichida kiritiladi (ikkita maydon),
    // shuning uchun yuqoridagi umumiy summa maydoni yashiriladi.
    if (usul.aralash) {
      const tXato = tolovXato(remaining, usul, { qarzRuxsat: true })
      if (tXato) return setError(tXato)
    } else if (!(num(amount) > 0)) {
      return setError('Summani kiriting')
    } else if (num(amount) > remaining) {
      return setError(`Qoldiqdan (${money(remaining)}) oshib ketdi`)
    }

    setError(''); setPaying(true)
    try {
      await api.patch(`/api/qarz/${qarz._id}/tolov`, {
        ...(usul.aralash
          ? { naqtSumma: usul.naqt, kartaSumma: usul.karta }
          : { amount: num(amount), usul: usul.usul }),
        sana: sana || undefined,
      })
      onPaid()
    } catch (e) { setError(e.message) }
    finally { setPaying(false) }
  }

  return (
    <BottomModal open={!!qarz} onClose={onClose} title={`${qarz.buyer.name} — qarzni to'lash`}>
      <div className="px-5 pt-3">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-separator">
          <span className="text-sm text-text-sub">Qoldiq</span>
          <span className="text-base font-bold text-corange">{money(remaining)} so'm</span>
        </div>

        <ErrorMsg msg={error} onClose={() => setError('')} />

        {!usul.aralash && (
          <>
            <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">To'lov summasi</p>
            <div className="flex items-center bg-cbg border border-cborder rounded-xl px-4 py-3 mb-2">
              <input
                type="text" inputMode="numeric" autoFocus
                value={fmtInput(amount)}
                onChange={e => setAmount(e.target.value.replace(/[\s\D]/g, ''))}
                placeholder="0"
                className="flex-1 bg-transparent text-ctext text-lg font-semibold outline-none"
              />
              <span className="text-text-sub text-sm">so'm</span>
            </div>
            <button onClick={() => setAmount(String(remaining))}
              className="text-xs text-primary font-semibold mb-4 hover:underline">
              To'liq to'lash ({money(remaining)} so'm)
            </button>
          </>
        )}

        <TolovField
          jami={remaining}
          value={usul}
          onChange={setUsul}
          qarzRuxsat
          qoldiqMatn="Qarzda qoladi"
          className="mb-4"
        />
        <SanaField value={sana} onChange={setSana} label="To'lov sanasi"
          min={todayLocal(new Date(qarz.createdAt))} />

        <button onClick={pay} disabled={paying}
          className="w-full h-12 rounded-xl bg-cgreen text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
          {paying
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Check size={18} /> To'lovni saqlash</>}
        </button>
      </div>
    </BottomModal>
  )
}

export default function QarzDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [qarz, setQarz]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [editOpen, setEdit]   = useState(false)
  const [payOpen, setPay]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/api/qarz/${id}`)
      .then(setQarz)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await api.del(`/api/qarz/${id}`)
      navigate(-1)
    } catch (e) { setError(e.message); setDeleting(false) }
  }

  const remaining = qarz ? qarz.totalPrice - qarz.paidAmount : 0
  const pct = qarz && qarz.totalPrice > 0 ? Math.min(100, Math.round((qarz.paidAmount / qarz.totalPrice) * 100)) : 0

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline">
        <ArrowLeft size={16} /> Ortga
      </button>

      {loading ? <Spinner /> : !qarz ? (
        <ErrorMsg msg={error || 'Topilmadi'} />
      ) : (
        <>
          <ErrorMsg msg={error} onClose={() => setError('')} />

          {/* Sarlavha: xaridor + holat */}
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                <User size={18} />
              </div>
              <h1 className="text-2xl font-bold text-ctext tracking-tight truncate">{qarz.buyer?.name}</h1>
            </div>
            {qarz.isPaid
              ? <span className="text-sm font-semibold px-3 py-1 rounded-full bg-green-bg text-cgreen shrink-0">To'landi</span>
              : <span className="text-sm font-semibold px-3 py-1 rounded-full bg-orange-bg text-corange shrink-0">Qarzdor</span>}
          </div>
          <a href={`tel:${qarz.buyer?.phone}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary mb-5 ml-[3.25rem] hover:underline">
            <Phone size={13} /> {qarz.buyer?.phone}
          </a>

          {/* Pul xulosasi + progress */}
          <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
            <div className="grid grid-cols-3 divide-x divide-separator">
              <div className="p-4 text-center">
                <p className="text-[11px] text-text-sub">Umumiy qarz</p>
                <p className="text-sm font-bold text-ctext mt-1">{money(qarz.totalPrice)}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[11px] text-cgreen/80">To'langan</p>
                <p className="text-sm font-bold text-cgreen mt-1">{money(qarz.paidAmount)}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[11px] text-corange/80">Qoldiq</p>
                <p className="text-sm font-bold text-corange mt-1">{money(remaining)}</p>
              </div>
            </div>
            {!qarz.isPaid && qarz.paidAmount > 0 && (
              <div className="px-4 pb-4">
                <div className="h-1.5 bg-cbg rounded-full overflow-hidden">
                  <div className="h-full bg-cgreen" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-text-sub mt-1 text-right">{pct}% to'langan</p>
              </div>
            )}
          </div>

          {/* Gullar */}
          <p className="text-xs font-bold text-text-sub uppercase tracking-wider px-1 mb-2">Gullar</p>
          <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5 divide-y divide-separator">
            {(qarz.flowers || []).map((f, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ctext">{f.type} · {f.razmer}sm</p>
                  <p className="text-xs text-text-sub mt-0.5">
                    {f.qty} ta × {money(f.pricePerUnit)} so'm
                    {f.discountPrice != null && <span className="text-corange"> · chegirma {money(f.discountPrice)}</span>}
                  </p>
                </div>
                <p className="text-sm font-bold text-ctext shrink-0">{money(flowerTotal(f))} so'm</p>
              </div>
            ))}
          </div>

          {/* To'lovlar tarixi */}
          <p className="text-xs font-bold text-text-sub uppercase tracking-wider px-1 mb-2">To'lovlar tarixi</p>
          <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
            {(qarz.payments || []).length === 0 ? (
              <p className="text-sm text-text-sub text-center py-6">Hali to'lov qilinmagan</p>
            ) : (
              <div className="divide-y divide-separator">
                {qarz.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TolovBadge value={p.usul} />
                      <span className="text-xs text-text-sub">{sanaSoat(p.at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-cgreen shrink-0">+{money(p.amount)} so'm</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
            {[
              { label: 'Kassa', value: qarz.kassa?.name || '—' },
              { label: 'Sotilgan sana', value: sanaSoat(qarz.createdAt) },
              ...(qarz.isPaid && qarz.paidAt ? [{ label: 'Yopilgan sana', value: sanaSoat(qarz.paidAt) }] : []),
              ...(!qarz.isPaid && kunKutdi(qarz.createdAt) ? [{ label: 'Holat', value: kunKutdi(qarz.createdAt) }] : []),
            ].map(({ label, value }, i) => (
              <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
                <span className="text-sm text-text-sub">{label}</span>
                <span className="text-sm font-semibold text-ctext">{value}</span>
              </div>
            ))}
          </div>

          {/* Amallar */}
          <div className="space-y-3">
            {/* Kassa: to'lov qilish (faqat ochiq qarz) */}
            {!isAdmin && !qarz.isPaid && (
              <button onClick={() => setPay(true)}
                className="flex items-center justify-center gap-2 w-full h-[50px] rounded-xl bg-cgreen text-white font-semibold text-base hover:opacity-90 transition-opacity">
                <HandCoins size={18} /> To'lov qilish
              </button>
            )}
            {/* Admin: tahrirlash + o'chirish */}
            {isAdmin && (
              <>
                <OutlineButton title="Tahrirlash" icon={<Pencil size={17} />} onClick={() => setEdit(true)} />
                <DeleteButton onConfirm={handleDelete} loading={deleting} label="Qarzni o'chirish" />
              </>
            )}
          </div>
        </>
      )}

      {/* Admin edit — xaridor, gullar, to'lovlar (o'chirish ham ichida) */}
      <QarzEditModal
        qarz={qarz}
        open={editOpen}
        onClose={() => setEdit(false)}
        onSaved={u => setQarz(u)}
        onDeleted={() => navigate(-1)}
      />

      {/* Kassa to'lov */}
      {payOpen && (
        <TolovModal
          qarz={qarz}
          onClose={() => setPay(false)}
          onPaid={() => { setPay(false); load() }}
        />
      )}
    </div>
  )
}
