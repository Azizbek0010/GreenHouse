import { useState, useRef } from 'react'
import {
  Sun, Moon, Camera, Eye, EyeOff, Check,
  ChevronDown, Phone, Lock,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { API_URL } from '../../lib/config'

// ── Avatar ──────────────────────────────────────────────────────────
function AvatarBlock({ user, onUpload }) {
  const [imgErr, setImgErr]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr]           = useState('')
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setErr(''); setUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const data = await api.patchForm('/api/auth/profile', form)
      onUpload(data.user?.avatar || data.avatar)
      setImgErr(false)
    } catch (e) { setErr(e.message) }
    finally { setUploading(false) }
  }

  const src = user?.avatar && !imgErr ? `${API_URL}${user.avatar}` : null

  return (
    <div className="flex items-center gap-4 px-4 py-5">
      <div className="relative shrink-0">
        {src ? (
          <img src={src} className="w-16 h-16 rounded-full object-cover" alt="" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
            {(user?.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow hover:opacity-90 transition-opacity"
        >
          {uploading
            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Camera size={11} />
          }
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <div className="min-w-0">
        <p className="text-base font-bold text-ctext leading-tight">{user?.name}</p>
        <p className="text-sm text-text-sub capitalize mt-0.5">{user?.role}</p>
        {err && <p className="text-xs text-cred mt-1">{err}</p>}
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs text-primary font-medium mt-1 hover:underline"
        >
          Rasmni o'zgartirish
        </button>
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
      const form = new FormData()
      form.append('name', name.trim())
      const data = await api.patchForm('/api/auth/profile', form)
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

      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[500px]' : 'max-h-0'}`}>
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
      const form = new FormData()
      form.append('phone', '+998' + phone)
      const data = await api.patchForm('/api/auth/profile', form)
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
      const form = new FormData()
      form.append('currentPassword', cur)
      form.append('newPassword', nw)
      await api.patchForm('/api/auth/profile', form)
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
        <AvatarBlock user={user} onUpload={(avatar) => updateUser({ avatar })} />
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
