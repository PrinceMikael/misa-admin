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
  thanksgiving:   'Shukrani',
  repose_of_soul: 'Pumziko la Roho',
  healing:        'Uponyaji',
  special:        'Nia Maalum',
  birthday:       'Siku ya Kuzaliwa',
  anniversary:    'Maadhimisho',
  safe_travel:    'Safari Salama',
};

const STATUS_LABEL: Record<string, string> = {
  pending:  'Inasubiri',
  approved: 'Imeidhinishwa',
  flagged:  'Imewekwa Alama',
  rejected: 'Imekataliwa',
};

const DAY_NAMES = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

export default function DashboardPage() {
  const { userData, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalSchedules: 0, pendingIntentions: 0, approvedIntentions: 0, totalNotices: 0 });
  const [recentIntentions, setRecentIntentions] = useState<MassIntention[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<MassSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    if (isSuperAdmin) { router.replace('/super/analytics'); return; }
    if (!userData.parishId) { router.replace('/onboarding'); return; }
    loadDashboardData();
  }, [userData, isSuperAdmin]);

  const loadDashboardData = async () => {
    if (!userData?.parishId) return;
    try {
      setLoading(true);

      const schedulesSnap = await getDocs(query(
        collection(db, 'mass_schedules'),
        where('parishId', '==', userData.parishId),
        where('isActive', '==', true)
      ));
      const allSchedules = schedulesSnap.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MassSchedule[];

      const today = new Date().getDay();
      const todayScheds = allSchedules.filter(s => s.dayOfWeek === today);

      const pendingSnap = await getDocs(query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      ));
      const approvedSnap = await getDocs(query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        where('status', '==', 'approved')
      ));
      const noticesSnap = await getDocs(query(
        collection(db, 'notices'),
        where('parishId', '==', userData.parishId)
      ));
      const recentSnap = await getDocs(query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        orderBy('createdAt', 'desc'),
        limit(5)
      ));

      setStats({
        totalSchedules:     allSchedules.length,
        pendingIntentions:  pendingSnap.size,
        approvedIntentions: approvedSnap.size,
        totalNotices:       noticesSnap.size,
      });
      setTodaySchedules(todayScheds);
      setRecentIntentions(recentSnap.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MassIntention[]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayName = DAY_NAMES[new Date().getDay()];
  const todayDate = new Date().toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="p-5 sm:p-8 max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8 anim-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ash dark:text-[#4d7a63] mb-1">
            {todayName}, {todayDate}
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] leading-tight"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Dashibodi
          </h1>
          <hr className="gold-rule mt-4 max-w-30" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-ash" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>
              Inapakia…
            </p>
          </div>
        ) : !userData?.parishId ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #1a3d2e, #254d3a)' }}
            >
              <span className="material-symbols-outlined text-[#c4933f] text-3xl">church</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] mb-2"
                style={{ fontFamily: 'var(--font-cormorant)' }}>
              Haujapewa Parokia
            </h2>
            <p className="text-ash dark:text-[#6b9080] max-w-sm text-sm leading-relaxed">
              Akaunti yako bado haijaunganishwa na parokia yoyote. Wasiliana na msimamizi mkuu ili akupange parokia.
            </p>
          </div>
        ) : (
          <>
            {/* Stat band */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Ratiba', value: stats.totalSchedules,     icon: 'calendar_month', delay: 'anim-delay-1' },
                { label: 'Zinazosubiri', value: stats.pendingIntentions, icon: 'pending',    delay: 'anim-delay-2', highlight: stats.pendingIntentions > 0 },
                { label: 'Zimeidhinishwa', value: stats.approvedIntentions, icon: 'check_circle', delay: 'anim-delay-3' },
                { label: 'Matangazo',   value: stats.totalNotices,   icon: 'campaign',       delay: 'anim-delay-4' },
              ].map((s) => (
                <div key={s.label} className={`card stat-card p-5 anim-fade-up ${s.delay}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: s.highlight ? '#c4933f' : '#6b9080' }}
                    >
                      {s.icon}
                    </span>
                    {s.highlight && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#c4933f] animate-pulse" />
                    )}
                  </div>
                  <p
                    className="text-3xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] leading-none mb-1"
                    style={{ fontFamily: 'var(--font-cormorant)' }}
                  >
                    {s.value}
                  </p>
                  <p className="text-xs text-ash dark:text-[#4d7a63] font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Two-column lower section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Today's Mass */}
              <div className="card p-6 anim-fade-up anim-delay-3">
                <div className="flex items-center justify-between mb-5">
                  <h2
                    className="text-xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]"
                    style={{ fontFamily: 'var(--font-cormorant)' }}
                  >
                    Misa za Leo
                  </h2>
                  <Link
                    href="/schedules"
                    className="text-[11px] font-semibold uppercase tracking-widest text-[#c4933f] hover:text-[#b8832e] transition-colors"
                  >
                    Zote →
                  </Link>
                </div>
                <hr className="gold-rule mb-5" />

                {todaySchedules.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-ash-light dark:text-[#2e4a38] block mb-2">event_busy</span>
                    <p className="text-sm text-ash dark:text-[#4d7a63] italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Hakuna ratiba za Misa leo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySchedules.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-parchment-deep/60 dark:bg-[#1a2e23]">
                        <div
                          className="w-14 shrink-0 text-center"
                          style={{ fontFamily: 'var(--font-cormorant)' }}
                        >
                          <p className="text-2xl font-semibold text-[#c4933f] leading-none">{s.time}</p>
                          {s.timeLabel && <p className="text-[10px] text-ash uppercase tracking-wide mt-0.5">{s.timeLabel}</p>}
                        </div>
                        <div className="w-px h-10 bg-ash-light dark:bg-[#2e4a38]" />
                        <div>
                          <p className="text-sm font-medium text-ink dark:text-[#e8e3d8]">
                            Misa ya {s.language}
                          </p>
                          {s.location && <p className="text-xs text-ash mt-0.5">{s.location}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Intentions */}
              <div className="card p-6 anim-fade-up anim-delay-4">
                <div className="flex items-center justify-between mb-5">
                  <h2
                    className="text-xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]"
                    style={{ fontFamily: 'var(--font-cormorant)' }}
                  >
                    Nia za Hivi Karibuni
                  </h2>
                  <Link
                    href="/intentions"
                    className="text-[11px] font-semibold uppercase tracking-widest text-[#c4933f] hover:text-[#b8832e] transition-colors"
                  >
                    Zote →
                  </Link>
                </div>
                <hr className="gold-rule mb-5" />

                {recentIntentions.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-ash-light dark:text-[#2e4a38] block mb-2">assignment</span>
                    <p className="text-sm text-ash dark:text-[#4d7a63] italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      Hakuna nia za Misa bado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentIntentions.map((intention) => (
                      <div key={intention.id} className="flex items-start gap-3 py-3 border-b border-[#e8e3d8] dark:border-[#253d2e] last:border-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${
                          intention.status === 'pending'  ? 'bg-[#f59e0b]' :
                          intention.status === 'approved' ? 'bg-[#10b981]' :
                          intention.status === 'flagged'  ? 'bg-[#f97316]' : 'bg-ash-light'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink dark:text-[#e8e3d8] line-clamp-1">
                            {intention.intentionText}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {intention.intentionType && (
                              <span className="text-[10px] font-medium bg-parchment-deep dark:bg-[#1a2e23] text-ash px-2 py-0.5 rounded">
                                {INTENTION_TYPE_LABELS[intention.intentionType] ?? intention.intentionType}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              intention.status === 'pending'  ? 'badge-pending' :
                              intention.status === 'approved' ? 'badge-approved' :
                              intention.status === 'flagged'  ? 'badge-flagged' : 'badge-rejected'
                            }`}>
                              {STATUS_LABEL[intention.status] ?? intention.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#a09a8e] mt-1">
                            {intention.submittedByName || 'Haijulikani'} · {intention.createdAt.toLocaleDateString('sw-TZ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
