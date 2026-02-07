'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { MassIntention } from '@/types';
import { format } from 'date-fns';

export default function IntentionsPage() {
  const { userData } = useAuth();
  const [intentions, setIntentions] = useState<MassIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'rejected'>('all');
  const [selectedIntention, setSelectedIntention] = useState<MassIntention | null>(null);

  useEffect(() => {
    if (userData?.parishId) {
      loadIntentions();
    }
  }, [userData]);

  const loadIntentions = async () => {
    if (!userData?.parishId) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'mass_intentions'),
        where('parishId', '==', userData.parishId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const intentionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        preferredDate: doc.data().preferredDate?.toDate(),
      })) as MassIntention[];

      setIntentions(intentionsData);
    } catch (error) {
      console.error('Error loading intentions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (intentionId: string, newStatus: MassIntention['status']) => {
    try {
      await updateDoc(doc(db, 'mass_intentions', intentionId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      loadIntentions();
      setSelectedIntention(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const filteredIntentions = filter === 'all'
    ? intentions
    : intentions.filter(i => i.status === filter);

  const statusCounts = {
    all: intentions.length,
    pending: intentions.filter(i => i.status === 'pending').length,
    approved: intentions.filter(i => i.status === 'approved').length,
    completed: intentions.filter(i => i.status === 'completed').length,
    rejected: intentions.filter(i => i.status === 'rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Mass Intentions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage Mass intentions submitted by parishioners
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all' as const, label: 'All', icon: 'list' },
            { key: 'pending' as const, label: 'Pending', icon: 'pending' },
            { key: 'approved' as const, label: 'Approved', icon: 'check_circle' },
            { key: 'completed' as const, label: 'Completed', icon: 'done_all' },
            { key: 'rejected' as const, label: 'Rejected', icon: 'cancel' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === tab.key
                  ? 'bg-white/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Intentions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : filteredIntentions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
              assignment
            </span>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' ? 'No Mass intentions yet' : `No ${filter} intentions`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIntentions.map(intention => (
              <div
                key={intention.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    intention.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                    intention.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20' :
                    intention.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    <span className={`material-symbols-outlined text-2xl ${
                      intention.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                      intention.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                      intention.status === 'completed' ? 'text-blue-600 dark:text-blue-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {intention.status === 'pending' ? 'pending' :
                       intention.status === 'approved' ? 'check_circle' :
                       intention.status === 'completed' ? 'done_all' : 'cancel'}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(intention.createdAt, 'PPpp')}
                        </p>
                        {intention.submittedByName && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            From: {intention.submittedByName}
                          </p>
                        )}
                        {intention.submittedByPhone && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Phone: {intention.submittedByPhone}
                          </p>
                        )}
                        {intention.submittedByEmail && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Email: {intention.submittedByEmail}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        intention.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        intention.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        intention.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {intention.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {intention.intentionText}
                      </p>
                    </div>

                    {intention.adminNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Admin Notes:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{intention.adminNotes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {intention.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(intention.id, 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(intention.id, 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Reject
                          </button>
                        </>
                      )}
                      {intention.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(intention.id, 'completed')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">done_all</span>
                          Mark as Completed
                        </button>
                      )}
                      {intention.status !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(intention.id, 'pending')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">undo</span>
                          Move to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
