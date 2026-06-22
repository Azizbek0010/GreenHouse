import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  Trash2, Users, Settings, Sun, Moon, LogOut,
  Home, Menu, X, ChevronRight, History, Clock,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { API_URL } from '../lib/config'

const NAV = {
  admin: [
    { to: '/admin',            label: 'Bosh sahifa', icon: LayoutDashboard },
    { to: '/admin/partiyalar', label: 'Partiyalar',  icon: Package },
    { to: '/admin/sotuvlar',   label: 'Sotuvlar',    icon: ShoppingCart },
    { to: '/admin/statistika', label: 'Statistika',  icon: BarChart2 },
    { to: '/admin/atxod',      label: 'Atxod',       icon: Trash2 },
    { to: '/admin/tarix',      label: 'Tarix',       icon: Clock },
    { to: '/admin/users',      label: 'Foydalanuvchilar', icon: Users },
    { to: '/admin/sozlamalar', label: 'Sozlamalar',  icon: Settings },
  ],
  teplitsa: [
    { to: '/teplitsa',          label: 'Bosh sahifa', icon: Home },
    { to: '/teplitsa/yuborish', label: 'Yuborish',    icon: Package },
    { to: '/teplitsa/tarix',    label: 'Tarix',       icon: History },
  ],
  kassa: [
    { to: '/kassa',        label: 'Bosh sahifa', icon: Home },
    { to: '/kassa/qabul',  label: 'Qabul',       icon: Package },
    { to: '/kassa/sotuv',  label: 'Sotuv',       icon: ShoppingCart },
    { to: '/kassa/atxod',  label: 'Atxod',       icon: Trash2 },
    { to: '/kassa/tarix',  label: 'Tarix',       icon: History },
  ],
}

const ROLE_LABEL = { admin: 'Administrator', teplitsa: 'Teplitsa', kassa: 'Kassa' }

// Avatar: agar rasm yuklanmasa — harf ko'rsatadi
function Avatar({ user, size = 'sm' }) {
  const src = user?.avatar ? `${API_URL}${user.avatar}` : null
  const [err, setErr] = useState(false)
  // avatar o'zgarganda xato holatini qayta boshlash
  useEffect(() => { setErr(false) }, [src])

  const cls = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'

  if (src && !err) {
    return (
      <img
        src={src}
        className={`${cls} rounded-full object-cover shrink-0`}
        alt=""
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className={`${cls} rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0`}>
      {(user?.name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = NAV[user?.role] || []
  const onLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-dvh overflow-hidden bg-cbg">

      {/* ── Desktop Sidebar (md+) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-ccard border-r border-cborder">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-cborder">
          <span className="text-3xl select-none leading-none">🌸</span>
          <div>
            <p className="font-bold text-ctext text-sm leading-tight">Greenhouse</p>
            <p className="text-[11px] text-text-sub">{ROLE_LABEL[user?.role]}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/teplitsa' || to === '/kassa'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-sub hover:bg-cbg hover:text-ctext'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: profil + tema + chiqish */}
        <div className="border-t border-cborder p-3 space-y-1">
          <NavLink
            to="/profil"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cbg transition-colors"
          >
            <Avatar user={user} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ctext truncate">{user?.name}</p>
              <p className="text-xs text-text-sub">{ROLE_LABEL[user?.role]}</p>
            </div>
          </NavLink>

          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-text-sub hover:bg-cbg hover:text-ctext transition-colors"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            {dark ? "Yorug' rejim" : "Qorong'u rejim"}
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-cred hover:bg-red-bg transition-colors"
          >
            <LogOut size={17} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* ── Mobile fixed header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-16 bg-ccard border-b border-cborder shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="md" />
          <div>
            <p className="text-base font-bold text-ctext leading-tight">{user?.name}</p>
            <p className="text-xs text-text-sub capitalize">{ROLE_LABEL[user?.role]}</p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 rounded-xl bg-cbg border border-cborder flex items-center justify-center text-text-sub hover:text-ctext transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile overlay — fade in/out */}
      <div
        className="md:hidden fixed inset-0 z-40"
        style={{
          backgroundColor: drawerOpen ? 'rgba(0,0,0,0.45)' : 'transparent',
          transition: 'background-color 320ms ease',
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile Drawer — slide from right with cubic-bezier */}
      <div
        className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-ccard flex flex-col"
        style={{
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: drawerOpen ? '-8px 0 32px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-cborder">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="sm" />
            <div>
              <p className="text-sm font-semibold text-ctext">{user?.name}</p>
              <p className="text-xs text-text-sub">{ROLE_LABEL[user?.role]}</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1 text-text-sub">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/teplitsa' || to === '/kassa'}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl mb-0.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-sub hover:bg-cbg hover:text-ctext'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-30" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cborder p-3 space-y-1">
          <NavLink
            to="/profil"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-text-sub hover:bg-cbg hover:text-ctext transition-colors"
          >
            <Users size={17} />
            Profil
          </NavLink>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-cred hover:bg-red-bg transition-colors"
          >
            <LogOut size={17} />
            Chiqish
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  )
}
