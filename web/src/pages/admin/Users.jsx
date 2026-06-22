import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'
import { Spinner, EmptyState, ErrorMsg } from '../../components/ui'

const ROLE_LABEL = { admin: 'Admin', teplitsa: 'Teplitsa', kassa: 'Kassa' }
const ROLE_COLOR = {
  admin:    'bg-blue-bg text-primary',
  teplitsa: 'bg-green-bg text-cgreen',
  kassa:    'bg-orange-bg text-corange',
}

function UserAvatar({ user: u }) {
  const [err, setErr] = useState(false)
  if (u.avatar && !err) {
    return (
      <img
        src={`${API_URL}${u.avatar}`}
        className="w-10 h-10 rounded-full object-cover shrink-0"
        alt=""
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-base font-bold shrink-0">
      {(u.name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try { setUsers(await api.get('/api/auth/users')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ctext tracking-tight">Foydalanuvchilar</h1>
        <button onClick={load} className="p-2 rounded-xl hover:bg-cbg text-text-sub transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      <ErrorMsg msg={error} onClose={() => setError('')} />

      {loading ? <Spinner /> : users.length === 0 ? <EmptyState /> : (
        <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
          {users.map((u, i) => (
            <div key={u._id} className={`flex items-center gap-4 p-4 ${i > 0 ? 'border-t border-separator' : ''}`}>
              <UserAvatar user={u} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ctext">{u.name}</p>
                <p className="text-xs text-text-sub mt-0.5">{u.phone}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ROLE_COLOR[u.role] || 'bg-cbg text-cgray'}`}>
                {ROLE_LABEL[u.role] || u.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
