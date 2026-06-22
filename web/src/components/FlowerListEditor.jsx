import { Plus, Trash2, Plus as PlusIcon } from 'lucide-react'

const SIZES = [50, 60, 70, 80, 90, 100, 110]
const TYPES = ['Roza', 'Lola', 'Xrizantema', 'Gerbera', 'Boshqa']

export default function FlowerListEditor({ flowers, onChange, label = 'Gullar' }) {
  const addFlower = () => {
    onChange([...flowers, { type: TYPES[0], sizes: [] }])
  }

  const removeFlower = (i) => {
    onChange(flowers.filter((_, idx) => idx !== i))
  }

  const setType = (i, type) => {
    const next = [...flowers]
    next[i] = { ...next[i], type }
    onChange(next)
  }

  const toggleSize = (fi, sm) => {
    const next = [...flowers]
    const f = { ...next[fi] }
    const exists = f.sizes.find(s => s.sm === sm)
    if (exists) {
      f.sizes = f.sizes.filter(s => s.sm !== sm)
    } else {
      f.sizes = [...f.sizes, { sm, qty: 1 }]
    }
    next[fi] = f
    onChange(next)
  }

  const setQty = (fi, sm, qty) => {
    const next = [...flowers]
    const f = { ...next[fi] }
    f.sizes = f.sizes.map(s => s.sm === sm ? { ...s, qty: Math.max(1, Number(qty) || 1) } : s)
    next[fi] = f
    onChange(next)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-5 pb-2 pt-1">{label}</p>

      <div className="mx-5 space-y-3">
        {flowers.map((f, fi) => (
          <div key={fi} className="bg-ccard rounded-2xl border border-cborder overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-separator">
              <select
                value={f.type}
                onChange={e => setType(fi, e.target.value)}
                className="text-sm font-semibold text-ctext bg-transparent outline-none"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => removeFlower(fi)} className="text-cred p-1 hover:bg-red-bg rounded-lg">
                <Trash2 size={15} />
              </button>
            </div>

            {/* Sizes */}
            <div className="p-4">
              <p className="text-xs text-text-sub mb-2">O'lchamlar (sm):</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {SIZES.map(sm => {
                  const active = f.sizes.find(s => s.sm === sm)
                  return (
                    <button
                      key={sm}
                      onClick={() => toggleSize(fi, sm)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-cbg text-text-sub border border-cborder hover:border-primary'
                      }`}
                    >
                      {sm}sm
                    </button>
                  )
                })}
              </div>

              {f.sizes.length > 0 && (
                <div className="space-y-2">
                  {f.sizes.map(s => (
                    <div key={s.sm} className="flex items-center gap-3">
                      <span className="text-sm text-text-sub w-14">{s.sm}sm:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={s.qty}
                        onChange={e => setQty(fi, s.sm, e.target.value.replace(/\D/g, ''))}
                        className="w-24 px-3 py-1.5 rounded-lg border border-cborder bg-cbg text-ctext text-sm text-center outline-none focus:border-primary"
                      />
                      <span className="text-sm text-text-sub">ta</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={addFlower}
          className="flex items-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-cborder text-text-sub text-sm font-medium hover:border-primary hover:text-primary transition-colors"
        >
          <PlusIcon size={16} />
          Gul qo'shish
        </button>
      </div>
    </div>
  )
}
