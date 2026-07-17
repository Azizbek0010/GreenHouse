// Qolgan gullar — ombor qoldig'i: barcha turlar, tur ustiga bosilsa razmer kesimi ochiladi
import { useState, useEffect } from 'react'
import { Flower2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { loadStock, groupStock } from '../lib/stock'
import { Spinner, ErrorMsg } from '../components/ui'

export default function QolganGullar() {
  const [types, setTypes]     = useState([])   // spravochnikdagi barcha turlar
  const [stock, setStock]     = useState(new Map())
  const [open, setOpen]       = useState(null) // ochilgan tur nomi
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = async () => {
    setError('')
    try {
      const [rows, typeList] = await Promise.all([
        loadStock(),
        api.get('/api/flower-types'),
      ])
      const grouped = groupStock(rows)
      // Spravochnik turlari + qoldiqda bor bo'lgan boshqa nomlar (masalan teplitsa qo'lda yozgani)
      const names = typeList.map(t => t.name)
      for (const name of grouped.keys()) {
        if (!names.includes(name)) names.push(name)
      }
      setTypes(names)
      setStock(grouped)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const numColor = n => n > 0 ? 'text-cgreen' : n < 0 ? 'text-cred' : 'text-text-sub'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Flower2 size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-ctext flex-1">Qolgan gullar</h2>
        <button
          onClick={() => { setLoading(true); load() }}
          className="p-2 rounded-lg text-text-sub hover:bg-cbg transition-colors"
          title="Yangilash"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : (
        <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
          {types.map((name, i) => {
            const g = stock.get(name)
            const total = g ? g.total : 0
            const isOpen = open === name
            return (
              <div key={name} className={i > 0 ? 'border-t border-separator' : ''}>
                <button
                  onClick={() => setOpen(isOpen ? null : name)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-cbg transition-colors"
                >
                  <span className="flex-1 text-sm font-semibold text-ctext">{name}</span>
                  <span className={`text-sm font-bold ${numColor(total)}`}>{total} ta</span>
                  {isOpen ? <ChevronUp size={16} className="text-cborder" /> : <ChevronDown size={16} className="text-cborder" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-3">
                    {!g || g.sizes.length === 0 ? (
                      <p className="text-xs text-text-sub pb-1">Bu turdan hali gul qabul qilinmagan</p>
                    ) : (
                      <div className="bg-cbg rounded-xl overflow-hidden">
                        {g.sizes.map((s, si) => (
                          <div key={s.razmer} className={`flex items-center justify-between px-3.5 py-2.5 ${si > 0 ? 'border-t border-separator' : ''}`}>
                            <span className="text-sm text-ctext">{s.razmer} sm</span>
                            <span className={`text-sm font-semibold ${numColor(s.remaining)}`}>{s.remaining} ta</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {types.length === 0 && <p className="text-xs text-text-sub p-4">Gul turlari yo'q</p>}
        </div>
      )}
    </div>
  )
}
