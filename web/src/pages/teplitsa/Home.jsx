import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Flower2, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { StatCard, Badge, PrimaryButton, Spinner, EmptyState, ErrorMsg } from '../../components/ui'

function summarize(flowers = []) {
  return flowers.map(f => {
    const total = f.sizes.reduce((sum, s) => sum + s.qty, 0)
    return `${f.type} ${total}ta`
  }).join(', ')
}
function flowerCount(flowers = []) {
  return flowers.reduce((sum, f) => sum + f.sizes.reduce((a, s) => a + s.qty, 0), 0)
}
function isToday(d) {
  const x = new Date(d), n = new Date()
  return x.toDateString() === n.toDateString()
}

export default function TeplitsaHome() {
  const navigate = useNavigate()
  const [partiyalar, setPartiyalar] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setPartiyalar(await api.get('/api/partiya')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const todayCount   = partiyalar.filter(p => isToday(p.createdAt)).length
  const totalFlowers = partiyalar.reduce((sum, p) => sum + flowerCount(p.sent), 0)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-5 hidden md:block">Bosh sahifa</h1>

      {/* Stat cards */}
      <div className="flex gap-3 mb-5">
        <StatCard
          label="Bugun yuborildi"
          value={String(todayCount)}
          unit="ta partiya"
          icon={<Package size={17} />}
          bg="bg-blue-bg"
          textColor="text-primary"
        />
        <StatCard
          label="Jami gullar"
          value={String(totalFlowers)}
          unit="ta yuborildi"
          icon={<Flower2 size={17} />}
          bg="bg-green-bg"
          textColor="text-cgreen"
        />
      </div>

      {/* Send button */}
      <PrimaryButton
        title="Yangi partiya yuborish"
        icon={<Plus size={20} />}
        onClick={() => navigate('/teplitsa/yuborish')}
        className="mb-6"
      />

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {/* List */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider mb-2">Yuborilgan partiyalarim</p>

      {loading ? <Spinner /> : partiyalar.length === 0 ? (
        <EmptyState text="Hozircha partiya yo'q" />
      ) : (
        <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
          {partiyalar.map((p, i) => (
            <div key={p._id} className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-separator' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ctext">{p.batchId}</p>
                <p className="text-xs text-text-sub mt-0.5">
                  {summarize(p.sent)} → {p.kassa?.name || 'Kassa'}
                </p>
              </div>
              <Badge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
