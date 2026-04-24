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

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const showBadge = item.href === '/intentions' && pendingCount > 0;

    return (
      <li>
        <Link
          href={item.href}
          onClick={onClose}
          className={`
            relative group flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-[13px] font-medium transition-all duration-150
            ${isActive
              ? 'bg-white/10 text-white'
              : 'text-[#7a9e8d] hover:text-white hover:bg-white/7'
            }
          `}
        >
          {isActive && (
            <span className="absolute left-0 inset-y-2.5 w-[3px] rounded-r-full bg-[#c4933f]" />
          )}
          <span
            className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${
              isActive ? 'text-[#c4933f]' : 'text-[#4d7a63] group-hover:text-[#9db8a8]'
            }`}
          >
            {item.icon}
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {showBadge && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold bg-[#c4933f] text-white shrink-0">
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
          grain fixed lg:sticky top-0 left-0 z-50 lg:z-auto
          flex flex-col h-screen w-[260px] shrink-0
          transition-transform duration-250 ease-in-out
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'linear-gradient(180deg, #1a3d2e 0%, #0f2419 100%)' }}
      >

        {/* ── Brand ── */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #c4933f, #e2b96a)',
              color: '#1a3d2e',
              fontFamily: 'var(--font-cormorant)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            MA
          </div>
          <div className="min-w-0">
            <p
              className="text-white font-semibold leading-none"
              style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.0625rem', letterSpacing: '0.01em' }}
            >
              Misa Admin
            </p>
            <p className="text-[#3d6650] text-[10px] font-bold uppercase tracking-[0.18em] mt-[5px]">
              Usimamizi
            </p>
          </div>
        </div>

        <div className="mx-5 shrink-0"><hr className="gold-rule" /></div>

        {/* ── Navigation ── */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
          <p className="px-3 mb-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#3a5e4a]">
            Parokia
          </p>
          <ul className="space-y-0.5">
            {parishNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </ul>

          {isSuperAdmin && (
            <>
              <div className="mx-2 mt-5 mb-4"><hr className="gold-rule" /></div>
              <p className="px-3 mb-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#c4933f]/70">
                Msimamizi Mkuu
              </p>
              <ul className="space-y-0.5">
                {superNavItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* ── Bottom ── */}
        <div className="shrink-0 px-5 pb-5">
          <hr className="gold-rule mb-4" />

          {userData && (
            <div className="flex items-center gap-2.5 px-1 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
                style={{
                  background: 'rgba(196,147,63,0.15)',
                  color: '#c4933f',
                  fontFamily: 'var(--font-cormorant)',
                  border: '1px solid rgba(196,147,63,0.2)',
                }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#e8e3d8] text-[13px] font-medium truncate leading-tight">
                  {userData.displayName || userData.email}
                </p>
                <span className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
                  isSuperAdmin ? 'text-[#c4933f]' : 'text-[#3d6650]'
                }`}>
                  {isSuperAdmin ? 'Super Admin' : 'Msimamizi'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6b9080] hover:text-white hover:bg-white/7 text-[13px] font-medium transition-all"
            >
              <span className="material-symbols-outlined text-[17px] shrink-0">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              {theme === 'dark' ? 'Mwanga' : 'Giza'}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6b9080] hover:text-[#f87171] hover:bg-red-500/8 text-[13px] font-medium transition-all"
            >
              <span className="material-symbols-outlined text-[17px] shrink-0">logout</span>
              Toka
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
