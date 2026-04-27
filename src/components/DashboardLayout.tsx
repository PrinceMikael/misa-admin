'use client';

import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-dvh overflow-hidden bg-parchment dark:bg-[#0e1f17]">
        <Sidebar />

        {/*
          Spacer matches the sidebar width at every breakpoint:
          w-14 (56px) on mobile/tablet, w-64 (256px) on desktop.
          Sidebar is fixed so this block keeps the content column pushed right.
        */}
        <div className="w-14 lg:w-64 shrink-0" />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
