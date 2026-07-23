import { Banknote, CreditCard, HandCoins, HelpCircle } from 'lucide-react'

function money(n) { return (n || 0).toLocaleString('ru-RU') }

// Buyurtmachi so'ragan to'rtlik: umumiy savdo — naqt, karta, qarz.
//
// "Umumiy savdo" = shu davrda sotilgan hamma narsa, qarzga berilgani ham.
// "Kassaga tushgan pul" esa boshqa raqam (qarz faqat to'langanda kiradi) —
// u alohida ko'rsatiladi, chunki ikkovini qo'shsak bir pul ikki marta sanaladi.
export default function SavdoCard({ savdo, tushum, title = 'Umumiy savdo', subtitle }) {
  if (!savdo) return null
  const rows = [
    { key: 'naqt',    label: 'Naqt',  icon: Banknote,   value: savdo.naqt,  cls: 'text-cgreen' },
    { key: 'karta',   label: 'Karta', icon: CreditCard, value: savdo.karta, cls: 'text-primary' },
    { key: 'qarz',    label: 'Qarz',  icon: HandCoins,  value: savdo.qarz,  cls: 'text-corange' },
  ]
  // Eski yozuvlarda to'lov usuli yo'q — faqat mavjud bo'lsa ko'rsatamiz
  if (savdo.nomalum > 0) {
    rows.push({ key: 'nomalum', label: "Noma'lum", icon: HelpCircle, value: savdo.nomalum, cls: 'text-text-sub' })
  }

  return (
    <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-4">
      <div className="p-4 border-b border-separator">
        <p className="text-xs font-semibold text-text-sub uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-ctext mt-1">
          {money(savdo.jami)} <span className="text-base font-medium text-text-sub">so'm</span>
        </p>
        <p className="text-xs text-text-sub mt-0.5">
          {subtitle ?? `${savdo.gullar || 0} ta gul sotilgan`}
        </p>
      </div>

      <div className="divide-y divide-separator">
        {rows.map(r => {
          const Icon = r.icon
          return (
            <div key={r.key} className="flex items-center gap-2.5 px-4 py-2.5">
              <Icon size={15} className={r.cls} />
              <span className="flex-1 text-sm text-ctext">{r.label}</span>
              <span className={`text-sm font-semibold ${r.cls}`}>{money(r.value)}</span>
            </div>
          )
        })}
      </div>

      {tushum && (
        <div className="px-4 py-3 bg-cbg border-t border-separator">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ctext">Kassaga tushgan pul</p>
              <p className="text-[11px] text-text-sub mt-0.5">
                Qarz faqat to'langanda kiradi
                {tushum.qarzdan > 0 ? ` · qarzdan ${money(tushum.qarzdan)}` : ''}
              </p>
            </div>
            <p className="text-base font-bold text-cgreen shrink-0">{money(tushum.jami)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
