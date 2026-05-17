'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Inbox,
  PenLine,
  CalendarClock,
  Settings,
  Mail,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    label: 'Inbox',
    sublabel: 'Categorizer',
    icon: Inbox,
    exact: true,
  },
  {
    href: '/dashboard/drafter',
    label: 'AI Email Drafter',
    sublabel: null,
    icon: PenLine,
    exact: false,
  },
  {
    href: '/dashboard/scheduler',
    label: 'Send Scheduler',
    sublabel: null,
    icon: CalendarClock,
    exact: false,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    sublabel: null,
    icon: Settings,
    exact: false,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? 'U'
  const userName = session?.user?.name ?? 'User'
  const userEmail = session?.user?.email ?? ''

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">
            MailMind
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            AI Assistant
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Menu
        </p>
        {navItems.map(({ href, label, sublabel, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="flex-1 font-medium">
                {label}
                {sublabel && (
                  <span
                    className={cn(
                      'ml-1 text-[11px]',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    ({sublabel})
                  </span>
                )}
              </span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary-foreground/70" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Sign Out section */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
