'use client';

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        <Sidebar />

        {/*
          Desktop-only spacer that reserves the 16rem sidebar column.
          The sidebar is fixed (out of flex flow), so this invisible block
          pushes the content column to start at the right edge of the sidebar.
          Hidden on mobile — bottom nav replaces sidebar navigation.
        */}
        <div className="hidden lg:block w-64 shrink-0" />

        {/* Content column — flex-1 fills all remaining width; flex-col stacks main + bottom nav */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </ProtectedRoute>
  );
}
