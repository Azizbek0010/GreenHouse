import { useEffect, useState } from 'react'

/**
 * Animated bottom-sheet modal.
 * Always mounted; slide-up on open, slide-down on close.
 */
export default function BottomModal({ open, onClose, title, children }) {
  // Two-phase: mounted controls DOM presence, visible controls CSS transition
  const [mounted, setMounted]   = useState(open)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // small delay so browser registers the initial translate-y-full before transition
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    // Overlay — fade in/out
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: visible ? 'rgba(0,0,0,0.45)' : 'transparent', transition: 'background-color 300ms ease' }}
      onClick={onClose}
    >
      {/* Sheet — slide up/down */}
      <div
        className="w-full bg-ccard rounded-t-3xl shadow-2xl overflow-hidden"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-cborder rounded-full mx-auto mt-3 mb-1" />
        {title && (
          <p className="text-center text-sm font-bold text-ctext py-3 border-b border-separator">{title}</p>
        )}
        <div className="overflow-y-auto max-h-[70vh] pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
