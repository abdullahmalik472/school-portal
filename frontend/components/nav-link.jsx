'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Highlights the link of the page you are on
export function NavLink({ href, children }) {
  const path = usePathname()
  const active = href === '/dashboard' ? path === href : path.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {children}
    </Link>
  )
}
