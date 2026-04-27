'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      {/*
        h-dvh: uses dynamic viewport height so mobile browser chrome doesn't cause height
        overflow. Falls back gracefully on browsers that don't support dvh.
        overflow-hidden: clips the off-screen sidebar so it never widens the page.
      */}
      <div className="h-dvh overflow-hidden bg-parchment dark:bg-[#0e1f17]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/*
          On mobile: no left margin, fills full width.
          On desktop (lg+): shift right by sidebar width (w-64 = 16rem).
          min-w-0: prevents flex children from forcing this container wider than its parent.
        */}
        <div className="h-full flex flex-col lg:ml-64 min-w-0">

          {/* Mobile top bar */}
          <header
            className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a3d2e, #122b20)', boxShadow: '0 1px 8px rgba(0,0,0,0.25)' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1a3d2e] font-bold text-xs"
                style={{ background: 'linear-gradient(135deg, #c4933f, #e2b96a)', fontFamily: 'var(--font-cormorant)' }}
              >
                MA
              </div>
              <span
                className="text-white font-semibold"
                style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.125rem' }}
              >
                Misa Admin
              </span>
            </div>
          </header>

          {/*
            flex-1: fills remaining height after the mobile header.
            overflow-y-auto: vertical scroll lives here.
            overflow-x-hidden: no horizontal scroll ever escapes this container.
            min-w-0: critical — prevents flex child from overflowing its parent width.
          */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
