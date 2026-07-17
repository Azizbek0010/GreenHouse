import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2, User, Phone } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorMsg } from '../../components/ui'
import { useStockMap, stockRemaining, StockTypeSelect, StockSizeButtons } from '../../components/StockFlowerPicker'

function money(n)    { return (n || 0).toLocaleString('ru-RU') }
function num(s)      { return parseInt(String(s).replace(/\s/g, '')) || 0 }
function fmtInput(s) { return s ? String(s).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '' }

// Telefon: +998 dan keyingi 9 raqam. Kiritilgandan 998/+ ni tozalaydi, 9 taga cheklaydi.
function phoneDigits(raw) {
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('998')) d = d.slice(3)
  return d.slice(0, 9)
}
// 9 raqamni "XX XXX XX XX" ko'rinishida chiqaradi
function formatUzPhone(d) {
  const p = []
  if (d.length > 0) p.push(d.slice(0, 2))
  if (d.length > 2) p.push(d.slice(2, 5))
  if (d.length > 5) p.push(d.slice(5, 7))
  if (d.length > 7) p.push(d.slice(7, 9))
  return p.join(' ')
}

// ── One flower line item ──────────────────────────────────────────
function FlowerRow({ item, onChange, onRemove, canRemove, stock }) {
  const update = (field, val) => onChange({ ...item, [field]: val })
  const remaining = item.type && item.razmer ? stockRemaining(stock, item.type, item.razmer) : null

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
      <div className="flex items-center border-b border-separator">
        <div className="flex-1">
          <StockTypeSelect
            stock={stock}
            value={item.type}
            onChange={v => onChange({ ...item, type: v, razmer: null })}
          />
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="w-12 flex items-center justify-center text-cred hover:bg-red-bg transition-colors self-stretch"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-separator">
        <p className="text-xs text-text-sub mb-2 font-medium">Razmer</p>
        <StockSizeButtons
          stock={stock}
          type={item.type}
          value={item.razmer}
          onChange={z => update('razmer', z)}
        />
      </div>

      <div className="flex items-center px-4 py-3 border-b border-separator">
        <span className="flex-1 text-sm text-ctext">
          Soni
          {remaining != null && (
            <span className={`ml-2 text-xs ${num(item.qty) > remaining ? 'text-cred font-semibold' : 'text-text-sub'}`}>
              (omborda {remaining} ta)
            </span>
          )}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={item.qty}
          onChange={e => update('qty', e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-20 text-right bg-transparent text-ctext text-base font-semibold outline-none"
        />
        <span className="text-text-sub ml-1.5 text-sm">ta</span>
      </div>
      <div className="flex items-center px-4 py-3">
        <span className="flex-1 text-sm text-ctext">Narx (dona)</span>
        <input
          type="text"
          inputMode="numeric"
          value={fmtInput(item.narx)}
          onChange={e => update('narx', e.target.value.replace(/[\s\D]/g, ''))}
          placeholder="0"
          className="w-28 text-right bg-transparent text-ctext text-base font-semibold outline-none"
        />
        <span className="text-text-sub ml-1.5 text-sm">so'm</span>
      </div>

      {num(item.qty) > 0 && num(item.narx) > 0 && (
        <div className="px-4 py-2.5 bg-blue-bg border-t border-separator">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary">{num(item.qty)} × {money(num(item.narx))}</span>
            <span className="text-sm font-bold text-primary">{money(num(item.qty) * num(item.narx))} so'm</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/20">
            <span className="text-xs text-primary/70">Chegirma bilan (ixtiyoriy)</span>
            <input
              type="text"
              inputMode="numeric"
              value={fmtInput(item.chegirma)}
              onChange={e => update('chegirma', e.target.value.replace(/[\s\D]/g, ''))}
              placeholder="Yakuniy narx"
              className="w-32 text-right bg-transparent text-primary text-sm font-semibold outline-none placeholder:text-primary/40"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
const newItem = () => ({ id: Date.now() + Math.random(), type: '', razmer: null, qty: '', narx: '', chegirma: '' })
function itemTotal(it) {
  const orig = num(it.qty) * num(it.narx)
  const disc = num(it.chegirma)
  return disc > 0 ? disc : orig
}

export default function QarzSotuv() {
  const navigate = useNavigate()
  const { stock } = useStockMap()
  const [items, setItems]         = useState([newItem()])
  const [buyerName, setBuyerName]     = useState('')
  const [buyerPhone, setBuyerPhone]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const updateItem = (id, updated) => setItems(prev => prev.map(it => it.id === id ? updated : it))
  const removeItem = (id)          => setItems(prev => prev.filter(it => it.id !== id))
  const addItem    = ()            => setItems(prev => [...prev, newItem()])

  const total    = items.reduce((s, it) => s + itemTotal(it), 0)
  const totalQty = items.reduce((s, it) => s + num(it.qty), 0)

  const onSave = async () => {
    for (const it of items) {
      if (!it.type)            return setError('Gul turini tanlang')
      if (!it.razmer)          return setError('Razmerni tanlang')
      if (!(num(it.qty)  > 0)) return setError('Sonni kiriting')
      if (!(num(it.narx) > 0)) return setError('Narxni kiriting')
      if (num(it.chegirma) > 0 && num(it.chegirma) > num(it.qty) * num(it.narx))
        return setError("Chegirma narxi asl narxdan yuqori bo'lishi mumkin emas")
    }
    if (!buyerName.trim())     return setError('Sotib oluvchi ismini kiriting')
    if (buyerPhone.length !== 9) return setError("Telefon raqami to'liq emas: +998 dan keyin 9 ta raqam")

    // Ombor limiti: bir xil (tur, razmer) qatorlar jami qoldiqdan oshmasin
    const need = new Map()
    for (const it of items) {
      const k = `${it.type}|${it.razmer}`
      need.set(k, (need.get(k) || 0) + num(it.qty))
    }
    for (const [k, qty] of need) {
      const [t, sm] = k.split('|')
      const have = stockRemaining(stock, t, Number(sm))
      if (qty > have) return setError(`Omborda ${t} ${sm}sm dan faqat ${have} ta qolgan`)
    }

    setError(''); setSaving(true)
    try {
      const flowers = items.map(it => ({
        type: it.type, razmer: it.razmer, qty: num(it.qty), pricePerUnit: num(it.narx),
        discountPrice: num(it.chegirma) > 0 ? num(it.chegirma) : undefined,
      }))
      await api.post('/api/qarz', {
        flowers,
        buyerName:  buyerName.trim(),
        buyerPhone: '+998' + buyerPhone,
      })
      navigate('/kassa/tarix')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary text-sm font-medium mb-5 hover:underline">
        <ArrowLeft size={16} /> Ortga
      </button>
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-1">Qarzga sotish</h1>
      <p className="text-sm text-text-sub mb-5">Gul beriladi, puli keyin olinadi — sotib oluvchi ma'lumoti shart</p>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* Flower items */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Gullar</p>

      {items.map((item) => (
        <FlowerRow
          key={item.id}
          item={item}
          stock={stock}
          onChange={updated => updateItem(item.id, updated)}
          onRemove={() => removeItem(item.id)}
          canRemove={items.length > 1}
        />
      ))}

      <button
        onClick={addItem}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-cborder text-text-sub text-sm font-semibold hover:border-primary hover:text-primary transition-colors mb-5"
      >
        <Plus size={16} />
        Gul qo'shish
      </button>

      {/* Total */}
      {total > 0 && (
        <div className="bg-orange-bg border border-corange/20 rounded-2xl p-4 flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-corange font-semibold">Qarz summasi</p>
            <p className="text-xs text-corange/70 mt-0.5">{items.length} tur · {totalQty} ta gul</p>
          </div>
          <p className="text-2xl font-bold text-corange">{money(total)} <span className="text-base font-medium">s</span></p>
        </div>
      )}

      {/* Buyer */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Sotib oluvchi</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-3">
        <div className="flex items-center px-4 py-3 border-b border-separator">
          <User size={16} className="text-text-sub mr-2 shrink-0" />
          <input
            type="text"
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            placeholder="Ismi"
            className="flex-1 bg-transparent text-ctext text-base font-medium outline-none"
          />
        </div>
        <div className="flex items-center px-4 py-3">
          <Phone size={16} className="text-text-sub mr-2 shrink-0" />
          <span className="text-ctext text-base font-medium mr-1.5 shrink-0">+998</span>
          <input
            type="tel"
            inputMode="numeric"
            value={formatUzPhone(buyerPhone)}
            onChange={e => setBuyerPhone(phoneDigits(e.target.value))}
            placeholder="00 000 00 00"
            className="flex-1 bg-transparent text-ctext text-base font-medium outline-none tracking-wide"
          />
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-corange text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {saving
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Check size={18} /> Qarzga sotishni saqlash</>
        }
      </button>
      <button
        onClick={() => navigate(-1)}
        className="w-full h-11 rounded-xl border border-cborder text-text-sub text-sm font-medium hover:bg-cbg transition-colors"
      >
        Bekor qilish
      </button>
    </div>
  )
}
