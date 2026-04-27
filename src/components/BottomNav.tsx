'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

const parishItems = [
  { href: '/dashboard',  icon: 'dashboard',       label: 'Dash' },
  { href: '/parish',     icon: 'church',           label: 'Parokia' },
  { href: '/schedules',  icon: 'calendar_month',   label: 'Ratiba' },
  { href: '/intentions', icon: 'assignment',       label: 'Nia' },
  { href: '/notices',    icon: 'campaign',         label: 'Tangazo' },
  { href: '/settings',   icon: 'settings',         label: 'Zaidi' },
];

const superItems = [
  { href: '/super/parishes',  icon: 'location_city',   label: 'Parokia' },
  { href: '/super/admins',    icon: 'manage_accounts', label: 'Admin' },
  { href: '/super/analytics', icon: 'bar_chart',       label: 'Takwimu' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();
  const { pendingCount } = useNotifications();

  const items = isSuperAdmin ? [...parishItems, ...superItems] : parishItems;

  return (
    <nav
      className="lg:hidden shrink-0 flex overflow-x-auto"
      style={{ background: 'linear-gradient(180deg, #1a3d2e 0%, #0f2419 100%)', borderTop: '1px solid rgba(196,147,63,0.15)' }}
    >
      {items.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const showBadge = item.href === '/intentions' && pendingCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 min-w-[56px] transition-colors ${
              isActive ? 'text-[#c4933f]' : 'text-[#4d7a63] hover:text-[#9db8a8]'
            }`}
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {showBadge && (
                <span className="absolute -top-1 -right-1.5 inline-flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] font-bold bg-[#c4933f] text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
