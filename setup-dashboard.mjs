import fs from 'fs';
import path from 'path';

const baseDir = 'd:\\Project\\practice project\\email-assistant\\ai-email-assistant';
const dashboardDir = path.join(baseDir, 'app', 'dashboard');

// Create directory
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
  console.log('✅ Created app/dashboard directory');
}

// Create layout.tsx
const layoutContent = `'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  Inbox,
  FileText,
  Clock,
  Settings,
  LogOut,
  Mail,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: 'Inbox',
      href: '/dashboard/inbox',
      icon: Inbox,
      badge: 3,
    },
    {
      name: 'Templates',
      href: '/dashboard/templates',
      icon: FileText,
    },
    {
      name: 'Scheduled Queue',
      href: '/dashboard/queue',
      icon: Clock,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={\`fixed inset-y-0 left-0 z-50 flex flex-col bg-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 \${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
        }\`}
      >
        {/* Logo */}
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">EmailAI</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group relative flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors duration-200 hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>

            <div className="flex items-center gap-4">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                <span className="text-sm font-medium text-gray-700">JD</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full w-full bg-gray-50 p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dashboardDir, 'layout.tsx'), layoutContent);
console.log('✅ Created app/dashboard/layout.tsx');

// Create page.tsx
const pageContent = `import { ArrowUpRight, Mail, Clock, FileText } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    {
      label: 'Emails in Queue',
      value: '12',
      change: '+2 today',
      icon: Mail,
      color: 'blue',
    },
    {
      label: 'Templates',
      value: '8',
      change: '+1 this week',
      icon: FileText,
      color: 'purple',
    },
    {
      label: 'Scheduled',
      value: '5',
      change: '+3 pending',
      icon: Clock,
      color: 'orange',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your emails today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-green-600">
                    <ArrowUpRight className="h-4 w-4" />
                    {stat.change}
                  </p>
                </div>
                <div
                  className={\`rounded-lg p-3 \${
                    colorMap[stat.color as keyof typeof colorMap]
                  }\`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3].map((item) => (
            <div key={item} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Email template updated
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Template "Weekly Newsletter" was modified
                  </p>
                </div>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(dashboardDir, 'page.tsx'), pageContent);
console.log('✅ Created app/dashboard/page.tsx');

console.log('\n✅ All files created successfully!');
