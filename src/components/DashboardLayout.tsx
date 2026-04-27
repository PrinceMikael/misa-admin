'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      {/*
        flex: outer container is a flex row so children receive height from flex
        stretch, not from height:100% inheritance (which collapses when any
        ancestor in the Next.js wrapper chain has no explicit height).
        h-dvh: dynamic viewport height — won't be clipped by mobile browser chrome.
        overflow-hidden: clips the off-screen sidebar translation.
      */}
      <div className="flex h-dvh overflow-hidden bg-parchment dark:bg-[#0e1f17]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/*
          Desktop-only spacer that reserves the 16rem sidebar column.
          The sidebar is fixed (out of flex flow), so this invisible block
          pushes the content column to start at the right edge of the sidebar.
          Hidden on mobile — sidebar slides in as an overlay.
        */}
        <div className="hidden lg:block w-64 shrink-0" />

        {/* Content column — flex-1 fills all remaining width; flex-col stacks header + main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

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

          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
