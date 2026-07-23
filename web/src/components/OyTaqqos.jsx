import { TrendingUp, TrendingDown, CalendarRange, Minus } from 'lucide-react'
import { UZ_MONTHS } from '../lib/date'

// Oylik taqqoslash — bu oy va o'tgan oy, kalendar oy bo'yicha.
// Hisob har oyning 1-sanasida noldan boshlanadi (buyurtmachi shuni so'radi),
// shuning uchun sarlavhalarda aniq kunlar yozilgan: "Iyul 1–24" / "Iyun (to'liq)".
//
// Pastdagi qator — o'tgan oyning shu kunigacha bo'lgan qismi.
// Usiz oy boshida taqqoslash har doim "-90%" ko'rsatib, aldab qo'yardi:
// 3 kunni to'liq oy bilan solishtirib bo'lmaydi.

function money(n) { return (n || 0).toLocaleString('ru-RU') }
const oyNomi = i => (UZ_MONTHS[i] || '').replace(/^./, c => c.toUpperCase())

function Delta({ d, unit, kichik }) {
  if (!d) return null
  const zero = d.qiymat === 0
  const up   = d.qiymat > 0
  const Icon = zero ? Minus : up ? TrendingUp : TrendingDown
  const cls  = zero ? 'bg-cbg text-text-sub' : up ? 'bg-green-bg text-cgreen' : 'bg-red-bg text-cred'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${cls} ${
      kichik ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
    }`}>
      <Icon size={kichik ? 10 : 12} />
      {!zero && (up ? '+' : '−')}{money(Math.abs(d.qiymat))}{unit ? ` ${unit}` : ''}
      <span className="opacity-70">({d.foiz > 0 ? '+' : ''}{d.foiz}%)</span>
    </span>
  )
}

function OyUstuni({ sarlavha, izoh, savdo, gullar, aktiv }) {
  return (
    <div className={`flex-1 min-w-0 p-4 ${aktiv ? 'bg-blue-bg/40' : ''}`}>
      <p className="text-sm font-bold text-ctext truncate">{sarlavha}</p>
      <p className="text-[11px] text-text-sub mb-2.5">{izoh}</p>
      <p className="text-lg font-bold text-ctext leading-tight">
        {money(savdo)} <span className="text-xs font-medium text-text-sub">so'm</span>
      </p>
      <p className="text-sm font-semibold text-primary mt-0.5">{money(gullar)} ta gul</p>
    </div>
  )
}

export default function OyTaqqos({ data, className = '' }) {
  if (!data) return null
  const { buOy, otganOy, otganOyShuKunga, farq, farqShuKunga } = data

  return (
    <div className={`bg-ccard border border-cborder rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <CalendarRange size={14} className="text-primary" />
        <p className="text-xs font-bold text-text-sub uppercase tracking-wider">Oylik taqqoslash</p>
      </div>

      <div className="flex divide-x divide-separator border-y border-separator">
        <OyUstuni
          sarlavha={`${oyNomi(buOy.oy)} 1–${buOy.kun}`}
          izoh="Bu oy · hozirgacha"
          savdo={buOy.savdo}
          gullar={buOy.gullar}
          aktiv
        />
        <OyUstuni
          sarlavha={oyNomi(otganOy.oy)}
          izoh={`O'tgan oy · ${otganOy.kunlar} kun`}
          savdo={otganOy.savdo}
          gullar={otganOy.gullar}
        />
      </div>

      <div className="divide-y divide-separator">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-sm text-text-sub">Savdo farqi</span>
          <Delta d={farq.savdo} unit="so'm" />
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-sm text-text-sub">Gullar farqi</span>
          <Delta d={farq.gullar} unit="ta" />
        </div>
      </div>

      {/* Halol taqqoslash — o'tgan oyning shu kunigacha */}
      <div className="px-4 py-3 bg-cbg border-t border-separator">
        <p className="text-[11px] text-text-sub mb-1.5">
          {oyNomi(otganOy.oy)}ning {buOy.kun}-kunigacha:{' '}
          <span className="font-semibold text-ctext">{money(otganOyShuKunga.savdo)} so'm</span>
          {' · '}
          <span className="font-semibold text-ctext">{money(otganOyShuKunga.gullar)} ta gul</span>
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-text-sub">Shu bosqichda:</span>
          <Delta d={farqShuKunga.savdo}  unit="so'm" kichik />
          <Delta d={farqShuKunga.gullar} unit="ta"   kichik />
        </div>
      </div>
    </div>
  )
}
