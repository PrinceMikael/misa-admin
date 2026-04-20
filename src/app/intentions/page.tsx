'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { MassIntention } from '@/types';
import { format } from 'date-fns';

const INTENTION_TYPE_LABELS: Record<string, string> = {
  thanksgiving: 'Shukrani',
  repose_of_soul: 'Pumziko la Roho',
  healing: 'Uponyaji',
  special: 'Nia Maalum',
  birthday: 'Siku ya Kuzaliwa',
  anniversary: 'Maadhimisho',
  safe_travel: 'Safari Salama',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Inasubiri',
  approved: 'Imeidhinishwa',
  completed: 'Imekamilika',
  rejected: 'Imekataliwa',
  flagged: 'Imeripotiwa',
};

export default function IntentionsPage() {
  const { userData } = useAuth();
  const [intentions, setIntentions] = useState<MassIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'rejected' | 'flagged'>('all');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userData) return;
    if (userData.parishId) loadIntentions();
    else setLoading(false);
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
      const snapshot = await getDocs(q);
      setIntentions(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
        preferredDate: d.data().preferredDate?.toDate(),
      })) as MassIntention[]);
    } catch (error) {
      console.error('Error loading intentions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: MassIntention['status']) => {
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      const notes = adminNotes[id];
      if (notes?.trim()) updateData.adminNotes = notes.trim();
      await updateDoc(doc(db, 'mass_intentions', id), updateData);
      setAdminNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
      loadIntentions();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Imeshindwa kubadilisha hali');
    }
  };

  const filteredIntentions = filter === 'all' ? intentions : intentions.filter(i => i.status === filter);

  const statusCounts = {
    all: intentions.length,
    pending: intentions.filter(i => i.status === 'pending').length,
    approved: intentions.filter(i => i.status === 'approved').length,
    completed: intentions.filter(i => i.status === 'completed').length,
    rejected: intentions.filter(i => i.status === 'rejected').length,
    flagged: intentions.filter(i => i.status === 'flagged').length,
  };

  const tabs = [
    { key: 'all' as const, label: 'Zote', icon: 'list' },
    { key: 'pending' as const, label: 'Zinasubiri', icon: 'pending' },
    { key: 'approved' as const, label: 'Zimeidhinishwa', icon: 'check_circle' },
    { key: 'completed' as const, label: 'Zimekamilika', icon: 'done_all' },
    { key: 'rejected' as const, label: 'Zimekataliwa', icon: 'cancel' },
    { key: 'flagged' as const, label: 'Zimeripotiwa', icon: 'flag' },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Nia za Misa</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tazama na simamia nia za Misa zilizotumwa na waumini
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === tab.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
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
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">assignment</span>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' ? 'Hakuna nia za Misa bado' : `Hakuna nia ${STATUS_LABELS[filter]?.toLowerCase() ?? filter}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIntentions.map(intention => (
              <div
                key={intention.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    intention.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                    intention.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20' :
                    intention.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    intention.status === 'flagged' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    <span className={`material-symbols-outlined text-2xl ${
                      intention.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                      intention.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                      intention.status === 'completed' ? 'text-blue-600 dark:text-blue-400' :
                      intention.status === 'flagged' ? 'text-orange-600 dark:text-orange-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {intention.status === 'pending' ? 'pending' :
                       intention.status === 'approved' ? 'check_circle' :
                       intention.status === 'completed' ? 'done_all' :
                       intention.status === 'flagged' ? 'flag' : 'cancel'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(intention.createdAt, 'PPpp')}
                        </p>
                        {intention.submittedByName && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Kutoka: {intention.submittedByName}
                          </p>
                        )}
                        {intention.submittedByPhone && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Simu: {intention.submittedByPhone}
                          </p>
                        )}
                        {intention.submittedByEmail && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Barua pepe: {intention.submittedByEmail}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        intention.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        intention.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        intention.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        intention.status === 'flagged' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {STATUS_LABELS[intention.status] ?? intention.status}
                      </span>
                    </div>

                    {/* Intention text */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-3">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {intention.intentionText}
                      </p>
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {intention.intentionType && (
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                          {INTENTION_TYPE_LABELS[intention.intentionType] ?? intention.intentionType}
                        </span>
                      )}
                      {intention.beneficiaryName && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full">
                          Mnufaika: {intention.beneficiaryName}
                        </span>
                      )}
                      {intention.mpesaConfirmationCode && (
                        <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full">
                          M-Pesa: {intention.mpesaConfirmationCode}
                        </span>
                      )}
                      {intention.mpesaAmount != null && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full">
                          TZS {intention.mpesaAmount.toLocaleString()}
                        </span>
                      )}
                      {intention.preferredDate && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full">
                          Tarehe: {format(intention.preferredDate, 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>

                    {/* Note from submitter */}
                    {intention.note && (
                      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Maelezo ya mtumaji:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{intention.note}</p>
                      </div>
                    )}

                    {/* Admin notes */}
                    {intention.adminNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">Maelezo ya msimamizi:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{intention.adminNotes}</p>
                      </div>
                    )}

                    {/* Admin notes input */}
                    {(intention.status === 'pending' || intention.status === 'flagged') && (
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Ongeza maelezo ya msimamizi (hiari)..."
                          value={adminNotes[intention.id] ?? ''}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [intention.id]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {(intention.status === 'pending' || intention.status === 'flagged') && (
                        <>
                          <button
                            onClick={() => handleStatusChange(intention.id, 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            Idhinisha
                          </button>
                          <button
                            onClick={() => handleStatusChange(intention.id, 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Kataa
                          </button>
                          {intention.status !== 'flagged' && (
                            <button
                              onClick={() => handleStatusChange(intention.id, 'flagged')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">flag</span>
                              Ripoti
                            </button>
                          )}
                        </>
                      )}
                      {intention.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(intention.id, 'completed')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">done_all</span>
                          Kamilisha
                        </button>
                      )}
                      {intention.status !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(intention.id, 'pending')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">undo</span>
                          Rudisha Inasubiri
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
