'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-parchment dark:bg-[#0e1f17]">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-[#e8e3d8] dark:border-[#253d2e] rounded-full"></div>
      <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
    </div>
  </div>
);

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin, userData, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isSuperPath = pathname?.startsWith('/super/');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (userData?.status === 'disabled') {
      signOut().then(() => router.push('/login?error=disabled'));
      return;
    }
    if (isSuperAdmin && !isSuperPath) {
      router.push('/super/analytics');
    }
  }, [user, loading, isSuperAdmin, isSuperPath, router, userData?.status, signOut]);

  if (loading) return <Spinner />;

  if (!user || userData?.status === 'disabled' || (isSuperAdmin && !isSuperPath)) {
    return <Spinner />;
  }

  return <>{children}</>;
}
