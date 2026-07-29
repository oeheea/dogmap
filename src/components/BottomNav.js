'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/map', label: '지도', icon: '🗺️' },
  { href: '/browse', label: '둘러보기', icon: '🧭' },
  { href: '/moments', label: '모먼트', icon: '📸', center: true },
  { href: '/walk', label: '산책', icon: '🐾' },
  { href: '/me', label: '마이', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 pt-1.5" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/')
          if (t.center) {
            return (
              <Link key={t.href} href={t.href} className="flex flex-col items-center -mt-5">
                <span className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-4 border-white text-white shadow ${active ? 'bg-blue-600' : 'bg-blue-500'}`}>{t.icon}</span>
              </Link>
            )
          }
          return (
            <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-0.5 text-[10px] ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}