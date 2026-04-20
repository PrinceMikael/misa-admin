'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { MassSchedule, MassIntention } from '@/types';
import Link from 'next/link';

const INTENTION_TYPE_LABELS: Record<string, string> = {
  thanksgiving: 'Shukrani',
  repose_of_soul: 'Pumziko la Roho',
  healing: 'Uponyaji',
  special: 'Nia Maalum',
  birthday: 'Siku ya Kuzaliwa',
  anniversary: 'Maadhimisho',
  safe_travel: 'Safari Salama',
};

export default function DashboardPage() {
  const { userData, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSchedules: 0,
    pendingIntentions: 0,
    approvedIntentions: 0,
    totalNotices: 0,
  });
  const [recentIntentions, setRecentIntentions] = useState<MassIntention[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<MassSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    if (isSuperAdmin) {
      router.replace('/super/analytics');
      return;
    }
    if (userData.parishId) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [userData, isSuperAdmin]);

  const loadDashboardData = async () => {
    if (!userData?.parishId) return;

    try {
      setLoading(true);

      const schedulesQuery = query(
        collection(db, 'mass_schedules'),
        where('parishId', '==', userData.parishId),
        where('isActive', '==', true)
      );
      const schedulesSnap = await getDocs(schedulesQuery);
      const allSchedules = schedulesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MassSchedule[];

      const today = new Date().getDay();
      const todayScheds = allSchedules.filter(s => s.dayOfWeek === today);

      const pendingQuery = query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const pendingSnap = await getDocs(pendingQuery);

      const approvedQuery = query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        where('status', '==', 'approved')
      );
      const approvedSnap = await getDocs(approvedQuery);

      const noticesQuery = query(
        collection(db, 'notices'),
        where('parishId', '==', userData.parishId)
      );
      const noticesSnap = await getDocs(noticesQuery);

      const recentQuery = query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentSnap = await getDocs(recentQuery);
      const recent = recentSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MassIntention[];

      setStats({
        totalSchedules: allSchedules.length,
        pendingIntentions: pendingSnap.size,
        approvedIntentions: approvedSnap.size,
        totalNotices: noticesSnap.size,
      });
      setTodaySchedules(todayScheds);
      setRecentIntentions(recent);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashibodi</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Karibu tena! Hivi ndivyo inavyoendelea na parokia yako.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : !userData?.parishId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">church</span>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Haujapewa Parokia</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Akaunti yako bado haijaunganishwa na parokia yoyote. Wasiliana na msimamizi mkuu ili akupange parokia.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ratiba</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalSchedules}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">pending</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Zinazosubiri</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pendingIntentions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">check_circle</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Zimeidhinishwa</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.approvedIntentions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">campaign</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Matangazo</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalNotices}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Schedules */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ratiba za Misa za Leo</h2>
                <Link href="/schedules" className="text-primary hover:text-primary-dark text-sm font-medium">
                  Tazama Zote →
                </Link>
              </div>

              {todaySchedules.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  Hakuna ratiba za Misa leo
                </p>
              ) : (
                <div className="space-y-3">
                  {todaySchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-lg flex flex-col items-center justify-center text-primary">
                        <span className="text-xs font-bold">{schedule.timeLabel || 'MISA'}</span>
                        <span className="text-lg font-bold">{schedule.time}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Misa ya {schedule.language}</p>
                        {schedule.location && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{schedule.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Intentions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nia za Hivi Karibuni</h2>
                <Link href="/intentions" className="text-primary hover:text-primary-dark text-sm font-medium">
                  Tazama Zote →
                </Link>
              </div>

              {recentIntentions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  Hakuna nia za Misa bado
                </p>
              ) : (
                <div className="space-y-3">
                  {recentIntentions.map((intention) => (
                    <div key={intention.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        intention.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        intention.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20' :
                        intention.status === 'flagged' ? 'bg-orange-100 dark:bg-orange-900/20' :
                        'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <span className={`material-symbols-outlined text-xl ${
                          intention.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                          intention.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                          intention.status === 'flagged' ? 'text-orange-600 dark:text-orange-400' :
                          'text-gray-600'
                        }`}>
                          {intention.status === 'pending' ? 'pending' :
                           intention.status === 'flagged' ? 'flag' : 'check_circle'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {intention.intentionText}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {intention.intentionType && (
                            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {INTENTION_TYPE_LABELS[intention.intentionType] ?? intention.intentionType}
                            </span>
                          )}
                          {intention.mpesaConfirmationCode && (
                            <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              M-Pesa: {intention.mpesaConfirmationCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {intention.submittedByName || 'Haijulikani'} • {intention.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                        intention.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        intention.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        intention.status === 'flagged' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {intention.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
