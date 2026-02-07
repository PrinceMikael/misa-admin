'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { MassSchedule, MassIntention } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalSchedules: 0,
    pendingIntentions: 0,
    approvedIntentions: 0,
  });
  const [recentIntentions, setRecentIntentions] = useState<MassIntention[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<MassSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.parishId) {
      loadDashboardData();
    }
  }, [userData]);

  const loadDashboardData = async () => {
    if (!userData?.parishId) return;

    try {
      setLoading(true);

      // Get total schedules
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

      // Get today's schedules
      const today = new Date().getDay();
      const todayScheds = allSchedules.filter(s => s.dayOfWeek === today);

      // Get pending intentions
      const pendingQuery = query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const pendingSnap = await getDocs(pendingQuery);

      // Get approved intentions count
      const approvedQuery = query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        where('status', '==', 'approved')
      );
      const approvedSnap = await getDocs(approvedQuery);

      // Get recent intentions (last 5)
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
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your parish.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Mass Schedules</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSchedules}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">pending</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Intentions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingIntentions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Approved Intentions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approvedIntentions}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Schedules */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Today's Mass Schedules</h2>
                <Link
                  href="/schedules"
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All →
                </Link>
              </div>

              {todaySchedules.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No Mass schedules for today
                </p>
              ) : (
                <div className="space-y-3">
                  {todaySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-lg flex flex-col items-center justify-center text-primary">
                        <span className="text-xs font-bold">{schedule.timeLabel || 'MASS'}</span>
                        <span className="text-lg font-bold">{schedule.time}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{schedule.language} Mass</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Mass Intentions</h2>
                <Link
                  href="/intentions"
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All →
                </Link>
              </div>

              {recentIntentions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  No Mass intentions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentIntentions.map((intention) => (
                    <div
                      key={intention.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        intention.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        intention.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20' :
                        'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <span className={`material-symbols-outlined text-xl ${
                          intention.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                          intention.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                          'text-gray-600'
                        }`}>
                          {intention.status === 'pending' ? 'pending' : 'check_circle'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {intention.intentionText}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {intention.submittedByName || 'Anonymous'} • {intention.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        intention.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        intention.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
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
