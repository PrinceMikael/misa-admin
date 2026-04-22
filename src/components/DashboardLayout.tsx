'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-parchment dark:bg-[#0e1f17]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header
            className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden"
            style={{ background: 'linear-gradient(135deg, #1a3d2e, #122b20)', boxShadow: '0 1px 8px rgba(0,0,0,0.25)' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1a3d2e] font-bold text-xs"
                style={{
                  background: 'linear-gradient(135deg, #c4933f, #e2b96a)',
                  fontFamily: 'var(--font-cormorant)',
                }}
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

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
