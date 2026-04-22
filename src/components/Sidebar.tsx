'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const parishNavItems: NavItem[] = [
  { href: '/dashboard',  icon: 'dashboard',       label: 'Dashibodi' },
  { href: '/parish',     icon: 'church',           label: 'Taarifa za Parokia' },
  { href: '/schedules',  icon: 'calendar_month',   label: 'Ratiba za Misa' },
  { href: '/intentions', icon: 'assignment',       label: 'Nia za Misa' },
  { href: '/notices',    icon: 'campaign',         label: 'Matangazo' },
  { href: '/settings',   icon: 'settings',         label: 'Mipangilio' },
];

const superNavItems: NavItem[] = [
  { href: '/super/parishes',  icon: 'location_city',   label: 'Parokia Zote' },
  { href: '/super/admins',    icon: 'manage_accounts', label: 'Wasimamizi' },
  { href: '/super/analytics', icon: 'bar_chart',       label: 'Takwimu' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userData, isSuperAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pendingCount } = useNotifications();

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  const initials = userData?.displayName
    ? userData.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'MA';

  const NavLink = ({ item, delay }: { item: NavItem; delay?: string }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const showBadge = item.href === '/intentions' && pendingCount > 0;
    return (
      <li>
        <Link
          href={item.href}
          onClick={onClose}
          style={delay ? { animationDelay: delay } : {}}
          className={`
            group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-150 relative
            ${isActive
              ? 'bg-white/10 text-white border-l-2 border-[#c4933f] pl-3.5'
              : 'text-[#9db8a8] hover:text-white hover:bg-white/8 border-l-2 border-transparent pl-3.5'
            }
          `}
        >
          <span className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${
            isActive ? 'text-[#c4933f]' : 'text-[#6b9080] group-hover:text-[#c4933f]'
          }`}>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {showBadge && (
            <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-bold bg-[#c4933f] text-white">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          grain
          fixed lg:sticky top-0 left-0 z-50 lg:z-auto
          w-64 flex flex-col h-screen
          transform transition-transform duration-250 ease-in-out
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'linear-gradient(180deg, #1a3d2e 0%, #122b20 100%)' }}
      >
        {/* Cross/ornament at very top */}
        <div className="flex justify-center pt-6 pb-2">
          <div className="text-[#c4933f] opacity-60 text-xl select-none" style={{ fontFamily: 'serif' }}>✦</div>
        </div>

        {/* Monogram badge */}
        <div className="px-6 pb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-base"
              style={{
                background: 'linear-gradient(135deg, #c4933f, #e2b96a)',
                color: '#1a3d2e',
                fontFamily: 'var(--font-cormorant)',
                fontSize: '1.125rem',
                letterSpacing: '0.05em',
              }}
            >
              {initials}
            </div>
            <div>
              <p
                className="text-white font-semibold leading-tight"
                style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.125rem', letterSpacing: '0.01em' }}
              >
                Misa Admin
              </p>
              <p className="text-[#6b9080] text-[11px] tracking-wider uppercase font-medium mt-0.5">
                Usimamizi
              </p>
            </div>
          </div>
        </div>

        {/* Gold rule */}
        <div className="mx-5 mb-4">
          <hr className="gold-rule" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto space-y-0.5">
          <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4d7a63]">
            Parokia
          </p>
          <ul className="space-y-0.5">
            {parishNavItems.map((item, i) => (
              <NavLink key={item.href} item={item} delay={`${i * 40}ms`} />
            ))}
          </ul>

          {isSuperAdmin && (
            <>
              <div className="mx-1 my-4">
                <hr className="gold-rule" />
              </div>
              <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c4933f]">
                Msimamizi Mkuu
              </p>
              <ul className="space-y-0.5">
                {superNavItems.map((item, i) => (
                  <NavLink key={item.href} item={item} delay={`${(i + parishNavItems.length) * 40}ms`} />
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className="mx-5 mt-4 mb-4">
          <hr className="gold-rule" />
        </div>
        <div className="px-3 pb-6 space-y-1">
          {/* User info */}
          {userData && (
            <div className="px-4 py-2 mb-2">
              <p className="text-sm text-white font-medium truncate">
                {userData.displayName || userData.email}
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                  isSuperAdmin
                    ? 'bg-[#c4933f]/20 text-gold-light'
                    : 'bg-white/10 text-[#9db8a8]'
                }`}
              >
                {isSuperAdmin ? 'Super Admin' : 'Parish Admin'}
              </span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#9db8a8] hover:text-white hover:bg-white/8 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-[#6b9080]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            {theme === 'dark' ? 'Mwanga' : 'Giza'}
          </button>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#9db8a8] hover:text-[#f87171] hover:bg-white/8 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Toka
          </button>
        </div>
      </aside>
    </>
  );
}
