import { useState, useEffect } from 'react'
import {
  Sun, Moon, Eye, EyeOff, Check,
  ChevronDown, Phone, Lock, Flower2, Plus, Trash2,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'

// ── Avatar ──────────────────────────────────────────────────────────
function AvatarBlock({ user }) {
  return (
    <div className="flex items-center gap-4 px-4 py-5">
      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
        {(user?.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold text-ctext leading-tight">{user?.name}</p>
        <p className="text-sm text-text-sub capitalize mt-0.5">{user?.role}</p>
      </div>
    </div>
  )
}

// ── Name form ────────────────────────────────────────────────────────
function NameForm({ user, onSave }) {
  const [name, setName]       = useState(user?.name || '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  const onSubmit = async () => {
    if (!name.trim()) return setErr('Ismni kiriting')
    setErr(''); setLoading(true)
    try {
      const data = await api.patch('/api/auth/profile', { name: name.trim() })
      onSave(data.user)
      setMsg('Saqlandi!'); setTimeout(() => setMsg(''), 2000)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div>
        <label className="text-xs font-semibold text-text-sub uppercase tracking-wide block mb-1.5">Ism</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cborder bg-cbg text-ctext text-sm outline-none focus:border-primary transition-colors"
          placeholder="To'liq ism"
        />
      </div>
      {err && <p className="text-xs text-cred">{err}</p>}
      {msg && <p className="text-xs text-cgreen flex items-center gap-1"><Check size={13} />{msg}</p>}
      <button
        onClick={onSubmit} disabled={loading}
        className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
      >
        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Saqlash'}
      </button>
    </div>
  )
}

// ── Accordion row ────────────────────────────────────────────────────
function AccordionRow({ icon: Icon, label, sublabel, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 w-full px-4 py-4 hover:bg-cbg transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-cbg border border-cborder flex items-center justify-center shrink-0">
          <Icon size={17} className="text-text-sub" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ctext">{label}</p>
          {sublabel && <p className="text-xs text-text-sub mt-0.5 truncate">{sublabel}</p>}
        </div>
        <ChevronDown
          size={16}
          className={`text-text-sub transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[1200px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4 pt-1 border-t border-separator bg-cbg/40">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Login (phone) change ─────────────────────────────────────────────
function LoginForm({ user, onSave }) {
  const [phone, setPhone]     = useState((user?.phone || '').replace('+998', ''))
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  const onSubmit = async () => {
    if (phone.length !== 9) return setErr("Telefon 9 raqam bo'lishi kerak")
    setErr(''); setLoading(true)
    try {
      const data = await api.patch('/api/auth/profile', { phone: '+998' + phone })
      onSave(data.user)
      setMsg('Login yangilandi!'); setTimeout(() => setMsg(''), 2500)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <label className="text-xs font-semibold text-text-sub uppercase tracking-wide block mb-1.5">
          Yangi telefon raqam
        </label>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-cborder bg-ccard focus-within:border-primary transition-colors">
          <span className="text-sm font-medium text-ctext">+998</span>
          <input
            type="tel" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
            className="flex-1 bg-transparent text-ctext text-sm outline-none"
            placeholder="90 123 45 67" maxLength={9}
          />
        </div>
      </div>
      {err && <p className="text-xs text-cred">{err}</p>}
      {msg && <p className="text-xs text-cgreen flex items-center gap-1"><Check size={13} />{msg}</p>}
      <button
        onClick={onSubmit} disabled={loading}
        className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
      >
        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Saqlash'}
      </button>
    </div>
  )
}

// ── Password change ──────────────────────────────────────────────────
function PasswordForm() {
  const [cur, setCur]         = useState('')
  const [nw, setNw]           = useState('')
  const [cnf, setCnf]         = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNw, setShowNw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  const onSubmit = async () => {
    if (!cur)          return setErr('Joriy parolni kiriting')
    if (nw.length < 6) return setErr('Kamida 6 ta belgi')
    if (nw !== cnf)    return setErr('Parollar mos emas')
    setErr(''); setLoading(true)
    try {
      await api.patch('/api/auth/profile', { currentPassword: cur, newPassword: nw })
      setMsg("Parol o'zgartirildi!"); setCur(''); setNw(''); setCnf('')
      setTimeout(() => setMsg(''), 2500)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Joriy parol */}
      <div>
        <label className="text-xs font-semibold text-text-sub uppercase tracking-wide block mb-1.5">Joriy parol</label>
        <div className="flex items-center px-4 py-3 rounded-xl border border-cborder bg-ccard focus-within:border-primary transition-colors">
          <input type={showCur ? 'text' : 'password'} value={cur} onChange={e => setCur(e.target.value)}
            className="flex-1 bg-transparent text-ctext text-sm outline-none" placeholder="••••••••" />
          <button type="button" onClick={() => setShowCur(s => !s)} className="text-cgray p-0.5">
            {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Yangi parol */}
      <div>
        <label className="text-xs font-semibold text-text-sub uppercase tracking-wide block mb-1.5">Yangi parol</label>
        <div className="flex items-center px-4 py-3 rounded-xl border border-cborder bg-ccard focus-within:border-primary transition-colors">
          <input type={showNw ? 'text' : 'password'} value={nw} onChange={e => setNw(e.target.value)}
            className="flex-1 bg-transparent text-ctext text-sm outline-none" placeholder="Kamida 6 ta belgi" />
          <button type="button" onClick={() => setShowNw(s => !s)} className="text-cgray p-0.5">
            {showNw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Tasdiqlash */}
      <div>
        <label className="text-xs font-semibold text-text-sub uppercase tracking-wide block mb-1.5">Yangi parolni tasdiqlang</label>
        <input type="password" value={cnf} onChange={e => setCnf(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cborder bg-ccard text-ctext text-sm outline-none focus:border-primary transition-colors"
          placeholder="••••••••" />
      </div>

      {err && <p className="text-xs text-cred">{err}</p>}
      {msg && <p className="text-xs text-cgreen flex items-center gap-1"><Check size={13} />{msg}</p>}

      <button
        onClick={onSubmit} disabled={loading}
        className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
      >
        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "O'zgartirish"}
      </button>
    </div>
  )
}

// ── Gul turlari (bazadan, hamma rollarda ko'rinadi) ──────────────────
function FlowerTypesManager() {
  const [types, setTypes]     = useState([])
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [armedId, setArmedId] = useState(null)   // ikki bosqichli o'chirish
  const [err, setErr]         = useState('')

  const load = () => {
    api.get('/api/flower-types')
      .then(setTypes)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!armedId) return
    const t = setTimeout(() => setArmedId(null), 3000)
    return () => clearTimeout(t)
  }, [armedId])

  const add = async () => {
    if (!name.trim()) return
    setAdding(true); setErr('')
    try {
      await api.post('/api/flower-types', { name: name.trim() })
      setName('')
      load()
    } catch (e) { setErr(e.message) }
    finally { setAdding(false) }
  }

  const del = async (id) => {
    if (armedId !== id) return setArmedId(id)
    setErr('')
    try {
      await api.del(`/api/flower-types/${id}`)
      setArmedId(null)
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="space-y-3 pt-2">
      {err && <p className="text-xs text-cred">{err}</p>}

      {/* Yangi tur qo'shish */}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Yangi gul turi nomi"
          className="flex-1 h-11 px-3 rounded-xl border border-cborder bg-ccard text-ctext text-sm outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={add}
          disabled={adding || !name.trim()}
          className="h-11 px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          <Plus size={15} /> Qo'shish
        </button>
      </div>

      {/* Ro'yxat */}
      {loading ? (
        <p className="text-xs text-text-sub py-2">Yuklanmoqda...</p>
      ) : (
        <div className="bg-ccard border border-cborder rounded-xl overflow-hidden">
          {types.map((t, i) => (
            <div key={t._id} className={`flex items-center justify-between px-3.5 py-2.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
              <span className="text-sm font-medium text-ctext">{t.name}</span>
              <button
                onClick={() => del(t._id)}
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors ${
                  armedId === t._id ? 'bg-cred text-white' : 'text-cred hover:bg-red-bg'
                }`}
              >
                <Trash2 size={13} />
                {armedId === t._id ? "O'chirilsinmi?" : ''}
              </button>
            </div>
          ))}
          {types.length === 0 && <p className="text-xs text-text-sub p-3">Turlar yo'q</p>}
        </div>
      )}
      <p className="text-xs text-text-sub">
        Qo'shilgan tur teplitsa va kassadagi tanlash ro'yxatida darhol ko'rinadi.
        O'chirilgan tur eski yozuvlarda saqlanib qoladi.
      </p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function AdminSozlamalar() {
  const { dark, toggle } = useTheme()
  const { user, updateUser } = useAuth()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-ctext tracking-tight mb-5">Sozlamalar</h1>

      {/* ── Profil ── */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-1 mb-2">Profil</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
        <AvatarBlock user={user} />
        <div className="border-t border-separator">
          <NameForm user={user} onSave={(u) => updateUser(u)} />
        </div>
      </div>

      {/* ── Login va parol ── */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-1 mb-2">Login va parol</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
        <AccordionRow
          icon={Phone}
          label="Login o'zgartirish"
          sublabel={user?.phone || '+998 — — — —'}
        >
          <LoginForm user={user} onSave={(u) => updateUser(u)} />
        </AccordionRow>

        <div className="h-px bg-separator" />

        <AccordionRow
          icon={Lock}
          label="Parol o'zgartirish"
          sublabel="Hisob xavfsizligini oshiring"
        >
          <PasswordForm />
        </AccordionRow>
      </div>

      {/* ── Gul turlari ── */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-1 mb-2">Gul turlari</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden mb-5">
        <AccordionRow
          icon={Flower2}
          label="Gul turlarini boshqarish"
          sublabel="Qo'shilgan tur hamma panellarda ko'rinadi"
        >
          <FlowerTypesManager />
        </AccordionRow>
      </div>

      {/* ── Ko'rinish ── */}
      <p className="text-xs font-semibold text-text-sub uppercase tracking-wider px-1 mb-2">Ko'rinish</p>
      <div className="bg-ccard border border-cborder rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cbg border border-cborder flex items-center justify-center">
              {dark ? <Moon size={17} className="text-text-sub" /> : <Sun size={17} className="text-text-sub" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-ctext">Tema</p>
              <p className="text-xs text-text-sub">{dark ? "Qorong'u rejim" : "Yorug' rejim"}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className={`relative w-14 h-7 rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-[#d1d5db]'}`}
          >
            <span
              style={{ left: dark ? '30px' : '2px' }}
              className="absolute top-[2px] w-6 h-6 bg-white rounded-full shadow transition-all duration-200"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
