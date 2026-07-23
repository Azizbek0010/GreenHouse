import { useState } from 'react'
import { Banknote, Flower2 } from 'lucide-react'

// Savdo grafigi. Ikkita o'lchov bir xil ma'lumotdan chiziladi:
//   Pul    — daromad (so'm)
//   Gullar — sotilgan gullar soni (ta)
// Backend har nuqtada ikkalasini ham qaytaradi (Sotuv + Qarz birga),
// shuning uchun almashtirish qayta so'rovsiz, bir zumda bo'ladi.

const MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

function shortMoney(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}
function shortQty(n) {
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K'
  return String(Math.round(n))
}

function BarChart({ data, metric }) {
  const W = 320, H = 160, PAD_L = 36, PAD_B = 28, PAD_T = 12, PAD_R = 8
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const val    = d => (metric === 'qty' ? d.qty : d.daromad) || 0
  const maxVal = Math.max(1, ...data.map(val))
  const fmtVal = metric === 'qty' ? shortQty : shortMoney

  // Oldingi davr (birinchi yarmi) — joriy davr barlari ortida och rangda
  const half     = Math.floor(data.length / 2)
  const prevData = data.slice(0, half)
  const curData  = data.slice(half)

  const fmtLabel = dateStr => {
    // 'YYYY-MM' (oylik) yoki 'YYYY-MM-DD' (kunlik/haftalik)
    if (dateStr.length === 7) return MONTHS_SHORT[Number(dateStr.slice(5, 7)) - 1]
    const [, m, d] = dateStr.split('-').map(Number)
    return `${d}/${m}`
  }

  const barW   = Math.floor((innerW / curData.length) * 0.6)
  const barGap = innerW / curData.length

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + innerH * (1 - f),
    label: f === 0 ? '0' : fmtVal(maxVal * f),
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="4 3" />
          <text x={PAD_L - 4} y={g.y + 4} textAnchor="end"
            fontSize="9" fill="currentColor" fillOpacity="0.4">{g.label}</text>
        </g>
      ))}

      {curData.map((d, i) => {
        const bh = Math.max(val(d) > 0 ? 2 : 0, (val(d) / maxVal) * innerH)
        const x  = PAD_L + i * barGap + (barGap - barW) / 2
        const y  = PAD_T + innerH - bh
        const prevD = prevData[i]
        const pbh   = prevD ? Math.max(val(prevD) > 0 ? 2 : 0, (val(prevD) / maxVal) * innerH) : 0
        return (
          <g key={i}>
            {pbh > 0 && (
              <rect x={x - barW * 0.35} y={PAD_T + innerH - pbh} width={barW * 0.5} height={pbh}
                rx="3" fill="currentColor" fillOpacity="0.12" />
            )}
            <rect x={x} y={y} width={barW} height={bh} rx="4"
              fill={metric === 'qty' ? '#e8804d' : '#4a7fc1'} />
            <text x={x + barW / 2} y={H - 8} textAnchor="middle"
              fontSize="9" fill="currentColor" fillOpacity="0.5">
              {fmtLabel(d.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const LEGEND = {
  daily:   { cur: 'Bu hafta',   prev: "O'tgan hafta" },
  weekly:  { cur: 'Bu 4 hafta', prev: "O'tgan 4 hafta" },
  monthly: { cur: 'Bu 3 oy',    prev: "O'tgan 3 oy" },
  alltime: { cur: 'Bu yil',     prev: "O'tgan yil" },
}

export default function SavdoChart({ data, chartType, loading, className = '' }) {
  const [metric, setMetric] = useState('daromad')
  const jami = (data || []).reduce((s, d) => s + ((metric === 'qty' ? d.qty : d.daromad) || 0), 0)

  return (
    <div className={`bg-ccard border border-cborder rounded-2xl p-4 ${className}`}>
      {/* Pul / Gullar almashtirgich */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1 p-1 bg-cbg border border-cborder rounded-xl">
          {[
            { key: 'daromad', label: 'Pul',    icon: Banknote, cls: 'text-primary' },
            { key: 'qty',     label: 'Gullar', icon: Flower2,  cls: 'text-corange' },
          ].map(m => {
            const Icon = m.icon
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  metric === m.key ? `bg-ccard shadow-sm ${m.cls}` : 'text-text-sub hover:text-ctext'
                }`}
              >
                <Icon size={13} /> {m.label}
              </button>
            )
          })}
        </div>
        <p className="flex-1 text-right text-sm font-bold text-ctext truncate">
          {jami.toLocaleString('ru-RU')}
          <span className="text-xs font-normal text-text-sub ml-1">{metric === 'qty' ? 'ta gul' : "so'm"}</span>
        </p>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data?.length > 0 ? (
        <>
          <BarChart data={data} metric={metric} />
          <div className="flex items-center gap-4 mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${metric === 'qty' ? 'bg-corange' : 'bg-primary'}`} />
              <span className="text-xs text-text-sub">{LEGEND[chartType]?.cur}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-cbg border border-cborder" />
              <span className="text-xs text-text-sub">{LEGEND[chartType]?.prev}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-text-sub">Ma'lumot yo'q</p>
        </div>
      )}
    </div>
  )
}
