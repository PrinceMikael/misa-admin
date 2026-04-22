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
const ADMIN_STATUSES = ['active', 'invited', 'disabled'];

const INTENTION_LABELS: Record<string, string> = {
  pending: 'Zinasubiri',
  approved: 'Zilizoidhinishwa',
  completed: 'Zilizokamilika',
  rejected: 'Zilizokataliwa',
  flagged: 'Zenye Alama',
};

const INTENTION_COLORS: Record<string, string> = {
  pending: 'bg-yellow-400',
  approved: 'bg-green-500',
  completed: 'bg-blue-500',
  rejected: 'bg-red-500',
  flagged: 'bg-orange-500',
};

const ADMIN_STATUS_LABELS: Record<string, string> = {
  active: 'Wanaohusika',
  invited: 'Waliobiriwa',
  disabled: 'Waliozuiwa',
};

const ADMIN_STATUS_COLORS: Record<string, string> = {
  active: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  invited: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
  disabled: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
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

      const parishes = parishSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Parish[];
      const admins = adminSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u: Record<string, unknown>) => u.role === 'PARISH_ADMIN') as User[];

      // Group intentions by status and parishId
      const intentionsByStatus: Record<string, number> = {};
      const intentionsByParish: Record<string, number> = {};
      const pendingByParish: Record<string, number> = {};

      intentionSnap.docs.forEach((d) => {
        const data = d.data();
        const status = data.status || 'pending';
        intentionsByStatus[status] = (intentionsByStatus[status] || 0) + 1;
        intentionsByParish[data.parishId] = (intentionsByParish[data.parishId] || 0) + 1;
        if (status === 'pending') {
          pendingByParish[data.parishId] = (pendingByParish[data.parishId] || 0) + 1;
        }
      });

      // Group notices and schedules by parishId
      const noticesByParish: Record<string, number> = {};
      noticeSnap.docs.forEach((d) => {
        const pid = d.data().parishId;
        noticesByParish[pid] = (noticesByParish[pid] || 0) + 1;
      });

      const schedulesByParish: Record<string, number> = {};
      scheduleSnap.docs.forEach((d) => {
        const pid = d.data().parishId;
        schedulesByParish[pid] = (schedulesByParish[pid] || 0) + 1;
      });

      // Admin by status
      const adminsByStatus: Record<string, number> = {};
      admins.forEach((a) => {
        const s = (a.status as string) || 'active';
        adminsByStatus[s] = (adminsByStatus[s] || 0) + 1;
      });

      // Admin email → name map
      const adminByParish = new Map<string, string>();
      admins.forEach((a) => {
        if (a.parishId) adminByParish.set(a.parishId, a.displayName || a.email);
      });

      // Build per-parish stats
      const parishStats: ParishStats[] = parishes.map((p) => ({
        id: p.id,
        name: p.name,
        diocese: p.diocese,
        adminName: adminByParish.get(p.id),
        intentions: intentionsByParish[p.id] || 0,
        pendingIntentions: pendingByParish[p.id] || 0,
        notices: noticesByParish[p.id] || 0,
        schedules: schedulesByParish[p.id] || 0,
      }));

      // Sort by total intentions desc
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
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Takwimu za Mfumo
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Muhtasari wa parokia zote
              </p>
            </div>
            <button
              onClick={() => loadStats(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>
                refresh
              </span>
              Sasisha
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
              </div>
            </div>
          ) : stats ? (
            <div className="space-y-6">

              {/* Top stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Parokia',
                    value: stats.totalParishes,
                    icon: 'location_city',
                    color: 'text-primary bg-primary/10',
                  },
                  {
                    label: 'Wasimamizi',
                    value: stats.totalAdmins,
                    icon: 'manage_accounts',
                    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
                  },
                  {
                    label: 'Nia Zote',
                    value: totalIntentions,
                    icon: 'assignment',
                    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
                  },
                  {
                    label: 'Matangazo',
                    value: stats.totalNotices,
                    icon: 'campaign',
                    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                      <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {card.value}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Middle row: Admin status + Intention breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Admin status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Hali ya Wasimamizi
                  </h2>
                  <div className="space-y-3">
                    {ADMIN_STATUSES.map((s) => {
                      const count = stats.adminsByStatus[s] || 0;
                      const pct = stats.totalAdmins > 0 ? Math.round((count / stats.totalAdmins) * 100) : 0;
                      return (
                        <div key={s}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-sm font-medium px-2 py-0.5 rounded ${ADMIN_STATUS_COLORS[s]}`}>
                              {ADMIN_STATUS_LABELS[s]}
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {count}
                              <span className="text-xs font-normal text-gray-400 ml-1">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s === 'active'
                                  ? 'bg-green-500'
                                  : s === 'invited'
                                  ? 'bg-yellow-400'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Intention status breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Nia za Misa kwa Hali
                  </h2>
                  {totalIntentions === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Bado hakuna nia zilizowasilishwa.</p>
                  ) : (
                    <div className="space-y-3">
                      {INTENTION_STATUSES.map((s) => {
                        const count = stats.intentionsByStatus[s] || 0;
                        const pct = totalIntentions > 0 ? Math.round((count / totalIntentions) * 100) : 0;
                        return (
                          <div key={s}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {INTENTION_LABELS[s]}
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {count}
                                <span className="text-xs font-normal text-gray-400 ml-1">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${INTENTION_COLORS[s]}`}
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

              {/* Per-parish activity table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Shughuli kwa Parokia
                  </h2>
                </div>

                {stats.parishStats.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Bado hakuna parokia iliyoandikishwa.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Parokia</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Msimamizi</th>
                            <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Nia Zote</th>
                            <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Zinasubiri</th>
                            <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Matangazo</th>
                            <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ratiba</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {stats.parishStats.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-6 py-4">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</p>
                                {p.diocese && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.diocese}</p>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                {p.adminName || <span className="text-gray-400 dark:text-gray-500 italic">Hana msimamizi</span>}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-semibold text-gray-900 dark:text-white">{p.intentions}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {p.pendingIntentions > 0 ? (
                                  <span className="inline-flex items-center justify-center min-w-6 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-bold rounded-full">
                                    {p.pendingIntentions}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-semibold text-gray-900 dark:text-white">{p.notices}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-semibold text-gray-900 dark:text-white">{p.schedules}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile */}
                    <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
                      {stats.parishStats.map((p) => (
                        <div key={p.id} className="px-4 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          {p.diocese && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.diocese}</p>
                          )}
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              { label: 'Nia', value: p.intentions },
                              { label: 'Zinasubiri', value: p.pendingIntentions, highlight: p.pendingIntentions > 0 },
                              { label: 'Matangazo', value: p.notices },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className={`text-center p-2 rounded-lg ${
                                  item.highlight
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                    : 'bg-gray-50 dark:bg-gray-700'
                                }`}
                              >
                                <p className={`text-lg font-bold ${item.highlight ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-900 dark:text-white'}`}>
                                  {item.value}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
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
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400">Imeshindwa kupakia takwimu.</p>
              <button
                onClick={() => loadStats()}
                className="mt-3 text-primary underline text-sm"
              >
                Jaribu tena
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </SuperAdminRoute>
  );
}
