import { Wallet, ShoppingBag, PackageCheck, HandCoins } from 'lucide-react'
import { money } from './StatBits'

// Tarix sahifasi uchun kunlik svodka: SanaFilter bilan tanlangan davr (Bugun/Kecha/
// aniq sana/oraliq) bo'yicha asosiy ko'rsatkichlar. Ro'yxatlar (sotuv/qarz/partiya)
// allaqachon sanaF.filter dan o'tgan holda beriladi — bu yerda faqat yig'indi olinadi.
//
// Qarzsiz topildi — FAQAT oddiy sotuv (Sotuv), qarz umuman aralashmaydi: buyurtmachi
// aynan shu ("qarzsiz qancha topildi") so'ragan, qarzning to'langan qismi ham
// hisobga kirmaydi (u alohida — qarz kartasida, pul + gul birga).
// Sotildi — umumiy aylanma (sotuv + qarz, qarz to'lanmagan bo'lsa ham kiradi).
function recvQty(p) {
  if (p.receivedTotal != null) return p.receivedTotal
  return (p.received || []).reduce((s, f) => s + (f.sizes || []).reduce((a, x) => a + x.qty, 0), 0)
}

export default function KunlikSvodka({ sotuvlar = [], qarzlar = [], partiyalar = null, label }) {
  const sotuvJami = sotuvlar.reduce((s, x) => s + (x.totalPrice || 0), 0)
  const qarzJami  = qarzlar.reduce((s, x) => s + (x.totalPrice || 0), 0)
  const sotildi   = sotuvJami + qarzJami
  const qarzGul   = qarzlar.reduce((s, x) => s + (x.flowers || []).reduce((a, f) => a + f.qty, 0), 0)
  const qabulGul  = partiyalar == null ? null
    : partiyalar.filter(p => p.receivedTotal != null || (p.received || []).length > 0)
                .reduce((s, p) => s + recvQty(p), 0)

  const Card = ({ icon: Icon, iconColor, iconBg, label, value, unit, sub }) => (
    <div className="bg-ccard border border-cborder rounded-2xl p-3.5 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={12} className={iconColor} />
        </div>
        <p className="text-[11px] font-semibold text-text-sub truncate">{label}</p>
      </div>
      <p className="text-lg font-bold text-ctext truncate">
        {money(value)} <span className="text-xs font-normal text-text-sub">{unit}</span>
      </p>
      {sub && <p className="text-[11px] text-text-sub/70 mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="mb-4">
      {label && <p className="text-xs font-semibold text-text-sub mb-2 px-1">{label}</p>}
      <div className={`grid ${qabulGul == null ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
        <Card icon={Wallet}      iconColor="text-cgreen"  iconBg="bg-green-bg"  label="Qarzsiz topildi" value={sotuvJami} unit="so'm" />
        <Card icon={ShoppingBag} iconColor="text-primary" iconBg="bg-blue-bg"   label="Sotildi"         value={sotildi}   unit="so'm" />
        {qabulGul != null && (
          <Card icon={PackageCheck} iconColor="text-primary" iconBg="bg-blue-bg" label="Qabul qilindi" value={qabulGul} unit="ta gul" />
        )}
        <Card icon={HandCoins}   iconColor="text-corange" iconBg="bg-orange-bg" label="Qarizga sotildi" value={qarzJami} unit="so'm"
          sub={`${money(qarzGul)} ta gul`} />
      </div>
    </div>
  )
}
