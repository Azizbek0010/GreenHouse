import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'

function formatPhone(d) {
  const parts = []
  if (d.length > 0) parts.push(d.slice(0, 2))
  if (d.length > 2) parts.push(d.slice(2, 5))
  if (d.length > 5) parts.push(d.slice(5, 7))
  if (d.length > 7) parts.push(d.slice(7, 9))
  return parts.join(' ')
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const onChangePhone = (e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (phone.length !== 9 || !password) {
      setError('Telefon (9 raqam) va parolni kiriting')
      return
    }
    setError('')
    setLoading(true)
    try {
      const user = await login('+998' + phone, password)
      navigate(`/${user.role}`, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cbg flex items-center justify-center px-4">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 w-9 h-9 rounded-xl bg-ccard border border-cborder flex items-center justify-center text-text-sub hover:text-ctext transition-colors"
      >
        {dark ? '☀️' : '🌙'}
      </button>


      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="text-8xl select-none mb-3"
            style={{ animation: 'floatSticker 3s ease-in-out infinite' }}
          >
            🌸
          </div>
          <h1 className="text-3xl font-bold text-ctext tracking-tight">Greenhouse</h1>
          <p className="text-cgray text-sm mt-1.5 text-center">Login va parolni admin beradi</p>
        </div>
        <style>{`
          @keyframes floatSticker {
            0%, 100% { transform: translateY(0) rotate(-3deg) scale(1); }
            50%       { transform: translateY(-10px) rotate(3deg) scale(1.05); }
          }
        `}</style>

        {/* Form */}
        <form onSubmit={onSubmit} className="bg-ccard rounded-2xl border border-cborder overflow-hidden mb-4">
          {/* Phone */}
          <div className="flex items-center px-4 py-3.5">
            <span className="text-text-sub text-sm w-20">Telefon</span>
            <span className="text-ctext font-medium mr-2">+998</span>
            <input
              type="tel"
              value={formatPhone(phone)}
              onChange={onChangePhone}
              placeholder="90 123 45 67"
              maxLength={12}
              className="flex-1 bg-transparent text-ctext text-base outline-none placeholder:text-[#c7c7cc]"
            />
          </div>
          <div className="h-px bg-separator mx-0" />
          {/* Password */}
          <div className="flex items-center px-4 py-3.5">
            <span className="text-text-sub text-sm w-20">Parol</span>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex-1 bg-transparent text-ctext text-base outline-none placeholder:text-[#c7c7cc]"
            />
            <button type="button" onClick={() => setShowPass(s => !s)} className="text-cgray p-1">
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-red-bg text-[#b02a2a] dark:text-red-300 text-sm border border-cred">
            {error}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : 'Kirish'}
        </button>

        <p className="text-center text-cgray text-sm mt-5">
          Kirishda muammo bo'lsa adminga murojaat qiling
        </p>
      </div>
    </div>
  )
}
