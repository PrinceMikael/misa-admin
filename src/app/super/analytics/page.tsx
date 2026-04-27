'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import SuperAdminRoute from '@/components/SuperAdminRoute';
import { Parish, User } from '@/types';

interface ParishStats {
  id: string;
  name: string;
  diocese?: string;
  adminName?: string;
  intentions: number;
  pendingIntentions: number;
  notices: number;
  schedules: number;
}

interface Stats {
  totalParishes: number;
  totalAdmins: number;
  adminsByStatus: Record<string, number>;
  intentionsByStatus: Record<string, number>;
  totalNotices: number;
  totalSchedules: number;
  parishStats: ParishStats[];
}

const INTENTION_STATUSES = ['pending', 'approved', 'completed', 'rejected', 'flagged'];

const INTENTION_LABELS: Record<string, string> = {
  pending:   'Zinasubiri',
  approved:  'Zilizoidhinishwa',
  completed: 'Zilizokamilika',
  rejected:  'Zilizokataliwa',
  flagged:   'Zenye Alama',
};

const INTENTION_BAR: Record<string, string> = {
  pending:   'bg-[#f59e0b]',
  approved:  'bg-[#10b981]',
  completed: 'bg-[#3b82f6]',
  rejected:  'bg-[#ef4444]',
  flagged:   'bg-[#f97316]',
};

const ADMIN_STATUSES = ['active', 'invited', 'disabled'];

const ADMIN_STATUS_LABELS: Record<string, string> = {
  active:   'Wanaohusika',
  invited:  'Waliobiriwa',
  disabled: 'Waliozuiwa',
};

const ADMIN_BAR: Record<string, string> = {
  active:   'bg-[#10b981]',
  invited:  'bg-[#f59e0b]',
  disabled: 'bg-[#ef4444]',
};

const ADMIN_BADGE: Record<string, string> = {
  active:   'bg-[#d1fae5] dark:bg-[#065f46]/20 text-[#065f46] dark:text-[#34d399]',
  invited:  'bg-[#fef3c7] dark:bg-[#92400e]/20 text-[#92400e] dark:text-[#fbbf24]',
  disabled: 'bg-[#fee2e2] dark:bg-[#991b1b]/20 text-[#991b1b] dark:text-[#f87171]',
};

export default function SuperAnalyticsPage() {
  const { loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      const [parishSnap, adminSnap, intentionSnap, noticeSnap, scheduleSnap] = await Promise.all([
        getDocs(query(collection(db, 'parishes'), orderBy('name'))),
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'mass_intentions')),
        getDocs(collection(db, 'notices')),
        getDocs(collection(db, 'mass_schedules')),
      ]);

      const parishes = parishSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Parish[];
      const admins = adminSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: Record<string, unknown>) => u.role === 'PARISH_ADMIN') as User[];

      const intentionsByStatus: Record<string, number> = {};
      const intentionsByParish: Record<string, number> = {};
      const pendingByParish: Record<string, number> = {};

      intentionSnap.docs.forEach(d => {
        const data = d.data();
        const status = data.status || 'pending';
        intentionsByStatus[status] = (intentionsByStatus[status] || 0) + 1;
        intentionsByParish[data.parishId] = (intentionsByParish[data.parishId] || 0) + 1;
        if (status === 'pending') pendingByParish[data.parishId] = (pendingByParish[data.parishId] || 0) + 1;
      });

      const noticesByParish: Record<string, number> = {};
      noticeSnap.docs.forEach(d => {
        const pid = d.data().parishId;
        noticesByParish[pid] = (noticesByParish[pid] || 0) + 1;
      });

      const schedulesByParish: Record<string, number> = {};
      scheduleSnap.docs.forEach(d => {
        const pid = d.data().parishId;
        schedulesByParish[pid] = (schedulesByParish[pid] || 0) + 1;
      });

      const adminsByStatus: Record<string, number> = {};
      admins.forEach(a => {
        const s = (a.status as string) || 'active';
        adminsByStatus[s] = (adminsByStatus[s] || 0) + 1;
      });

      const adminByParish = new Map<string, string>();
      admins.forEach(a => { if (a.parishId) adminByParish.set(a.parishId, a.displayName || a.email); });

      const parishStats: ParishStats[] = parishes.map(p => ({
        id: p.id, name: p.name, diocese: p.diocese,
        adminName: adminByParish.get(p.id),
        intentions: intentionsByParish[p.id] || 0,
        pendingIntentions: pendingByParish[p.id] || 0,
        notices: noticesByParish[p.id] || 0,
        schedules: schedulesByParish[p.id] || 0,
      }));
      parishStats.sort((a, b) => b.intentions - a.intentions);

      setStats({
        totalParishes: parishes.length,
        totalAdmins: admins.length,
        adminsByStatus,
        intentionsByStatus,
        totalNotices: noticeSnap.size,
        totalSchedules: scheduleSnap.size,
        parishStats,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) loadStats();
  }, [authLoading]);

  const totalIntentions = stats
    ? INTENTION_STATUSES.reduce((sum, s) => sum + (stats.intentionsByStatus[s] || 0), 0)
    : 0;

  return (
    <SuperAdminRoute>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6 anim-fade-up">
            <div>
              <h1
                className="text-4xl sm:text-5xl font-semibold leading-none text-[#1a3d2e] dark:text-[#e8e3d8]"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Takwimu za Mfumo
              </h1>
              <p className="text-sm text-ash dark:text-[#6b9080] mt-2">
                Muhtasari wa parokia zote
              </p>
              <hr className="gold-rule mt-4 max-w-20" />
            </div>
            <button
              onClick={() => loadStats(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e8e3d8] dark:border-[#253d2e] text-ash dark:text-[#6b9080] text-sm font-medium hover:border-[#c4933f] hover:text-[#1a3d2e] dark:hover:text-[#e8e3d8] transition-all disabled:opacity-50 shrink-0"
            >
              <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              <span className="hidden sm:inline">Sasisha</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 rounded-full border-2 border-[#c4933f]/20" />
                <div className="absolute inset-0 rounded-full border-2 border-[#c4933f] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>Inapakia…</p>
            </div>
          ) : stats ? (
            <div className="space-y-5">

              {/* Stat band */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Parokia',     value: stats.totalParishes,  icon: 'location_city' },
                  { label: 'Wasimamizi',  value: stats.totalAdmins,    icon: 'manage_accounts' },
                  { label: 'Nia Zote',    value: totalIntentions,       icon: 'assignment' },
                  { label: 'Matangazo',   value: stats.totalNotices,   icon: 'campaign' },
                ].map((card, i) => (
                  <div key={card.label} className={`card stat-card p-4 sm:p-5 anim-fade-up anim-delay-${i + 1}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="material-symbols-outlined text-[20px] text-[#6b9080]">{card.icon}</span>
                    </div>
                    <p
                      className="text-3xl sm:text-4xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] leading-none mb-1"
                      style={{ fontFamily: 'var(--font-cormorant)' }}
                    >
                      {card.value}
                    </p>
                    <p className="text-[11px] text-ash dark:text-[#4d7a63] font-medium uppercase tracking-wide">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Admin status + Intention breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

                {/* Admin status */}
                <div className="card p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                    Hali ya Wasimamizi
                  </h2>
                  <hr className="gold-rule my-3" />
                  <div className="space-y-4">
                    {ADMIN_STATUSES.map(s => {
                      const count = stats.adminsByStatus[s] || 0;
                      const pct = stats.totalAdmins > 0 ? Math.round((count / stats.totalAdmins) * 100) : 0;
                      return (
                        <div key={s}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded ${ADMIN_BADGE[s]}`}>
                              {ADMIN_STATUS_LABELS[s]}
                            </span>
                            <span className="text-sm font-bold text-ink dark:text-[#e8e3d8]">
                              {count}
                              <span className="text-[11px] font-normal text-ash ml-1">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-parchment-deep dark:bg-[#1a2e23] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${ADMIN_BAR[s]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Intention breakdown */}
                <div className="card p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                    Nia kwa Hali
                  </h2>
                  <hr className="gold-rule my-3" />
                  {totalIntentions === 0 ? (
                    <p className="text-sm text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Bado hakuna nia zilizowasilishwa.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {INTENTION_STATUSES.map(s => {
                        const count = stats.intentionsByStatus[s] || 0;
                        const pct = totalIntentions > 0 ? Math.round((count / totalIntentions) * 100) : 0;
                        return (
                          <div key={s}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-sm text-ink-soft dark:text-[#c0bdb6]">{INTENTION_LABELS[s]}</span>
                              <span className="text-sm font-bold text-ink dark:text-[#e8e3d8]">
                                {count}
                                <span className="text-[11px] font-normal text-ash ml-1">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-parchment-deep dark:bg-[#1a2e23] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${INTENTION_BAR[s]}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Per-parish table */}
              <div className="card overflow-hidden">
                <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#e8e3d8] dark:border-[#253d2e]">
                  <h2 className="text-xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]" style={{ fontFamily: 'var(--font-cormorant)' }}>
                    Shughuli kwa Parokia
                  </h2>
                  <span className="text-[11px] text-ash font-medium">{stats.parishStats.length} parokia</span>
                </div>

                {stats.parishStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <span className="material-symbols-outlined text-4xl text-ash-light dark:text-[#2e4a38] mb-3">location_city</span>
                    <p className="text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Bado hakuna parokia iliyoandikishwa.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#e8e3d8] dark:border-[#253d2e]">
                            {['Parokia', 'Msimamizi', 'Nia Zote', 'Zinasubiri', 'Matangazo', 'Ratiba'].map((h, i) => (
                              <th
                                key={h}
                                className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ash dark:text-[#4d7a63] ${i >= 2 ? 'text-center' : 'text-left'} ${i === 3 ? 'text-[#c4933f]' : ''}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8e3d8] dark:divide-[#253d2e]">
                          {stats.parishStats.map(p => (
                            <tr key={p.id} className="hover:bg-parchment/40 dark:hover:bg-[#1a2e23]/40 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="text-sm font-medium text-ink dark:text-[#e8e3d8]">{p.name}</p>
                                {p.diocese && <p className="text-[11px] text-ash mt-0.5">{p.diocese}</p>}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-ash dark:text-[#6b9080]">
                                {p.adminName || <span className="italic">Hana msimamizi</span>}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className="text-sm font-semibold text-ink dark:text-[#e8e3d8]">{p.intentions}</span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {p.pendingIntentions > 0 ? (
                                  <span className="inline-flex items-center justify-center min-w-6 px-2 py-0.5 bg-[#fef3c7] dark:bg-[#92400e]/20 text-[#92400e] dark:text-[#fbbf24] text-[11px] font-bold rounded-full">
                                    {p.pendingIntentions}
                                  </span>
                                ) : (
                                  <span className="text-ash-light">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className="text-sm font-semibold text-ink dark:text-[#e8e3d8]">{p.notices}</span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className="text-sm font-semibold text-ink dark:text-[#e8e3d8]">{p.schedules}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-[#e8e3d8] dark:divide-[#253d2e]">
                      {stats.parishStats.map(p => (
                        <div key={p.id} className="px-4 py-4">
                          <p className="text-sm font-semibold text-ink dark:text-[#e8e3d8]">{p.name}</p>
                          {p.diocese && <p className="text-[11px] text-ash mb-2">{p.diocese}</p>}
                          {p.adminName && <p className="text-[11px] text-ash dark:text-[#6b9080] mb-3">{p.adminName}</p>}
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Nia',       value: p.intentions,        highlight: false },
                              { label: 'Subiri',    value: p.pendingIntentions, highlight: p.pendingIntentions > 0 },
                              { label: 'Matangazo', value: p.notices,           highlight: false },
                              { label: 'Ratiba',    value: p.schedules,         highlight: false },
                            ].map(item => (
                              <div
                                key={item.label}
                                className={`text-center p-2 rounded-lg ${
                                  item.highlight ? 'bg-[#fef3c7] dark:bg-[#92400e]/20' : 'bg-parchment dark:bg-[#1a2e23]'
                                }`}
                              >
                                <p className={`text-lg font-bold leading-none ${
                                  item.highlight ? 'text-[#92400e] dark:text-[#fbbf24]' : 'text-ink dark:text-[#e8e3d8]'
                                }`} style={{ fontFamily: 'var(--font-cormorant)' }}>
                                  {item.value}
                                </p>
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-ash mt-1">{item.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-ash-light dark:text-[#2e4a38] mb-3">bar_chart</span>
              <p className="text-ash italic mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Imeshindwa kupakia takwimu.
              </p>
              <button onClick={() => loadStats()} className="btn-gold">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Jaribu tena
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </SuperAdminRoute>
  );
}
