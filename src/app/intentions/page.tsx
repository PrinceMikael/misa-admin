'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { MassIntention } from '@/types';
import { format } from 'date-fns';

const INTENTION_TYPE_LABELS: Record<string, string> = {
  thanksgiving:   'Shukrani',
  repose_of_soul: 'Pumziko la Roho',
  healing:        'Uponyaji',
  special:        'Nia Maalum',
  birthday:       'Siku ya Kuzaliwa',
  anniversary:    'Maadhimisho',
  safe_travel:    'Safari Salama',
};

const STATUS_LABELS: Record<string, string> = {
  pending:   'Inasubiri',
  approved:  'Imeidhinishwa',
  completed: 'Imekamilika',
  rejected:  'Imekataliwa',
  flagged:   'Imeripotiwa',
};

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-[#f59e0b]',
  approved:  'bg-[#10b981]',
  completed: 'bg-[#3b82f6]',
  flagged:   'bg-[#f97316]',
  rejected:  'bg-ash-light',
};

const TABS = [
  { key: 'all'       as const, label: 'Zote',          shortLabel: 'Zote',   icon: 'list' },
  { key: 'pending'   as const, label: 'Zinasubiri',     shortLabel: 'Subiri', icon: 'pending' },
  { key: 'approved'  as const, label: 'Zimeidhinishwa', shortLabel: 'Idhin.', icon: 'check_circle' },
  { key: 'completed' as const, label: 'Zimekamilika',   shortLabel: 'Kamili', icon: 'done_all' },
  { key: 'rejected'  as const, label: 'Zimekataliwa',   shortLabel: 'Kataa',  icon: 'cancel' },
  { key: 'flagged'   as const, label: 'Zimeripotiwa',   shortLabel: 'Ripoti', icon: 'flag' },
];

export default function IntentionsPage() {
  const { userData } = useAuth();
  const [intentions, setIntentions] = useState<MassIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof TABS[number]['key']>('all');
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
      const updateData: Record<string, unknown> = { status: newStatus, updatedAt: Timestamp.now() };
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
    all:       intentions.length,
    pending:   intentions.filter(i => i.status === 'pending').length,
    approved:  intentions.filter(i => i.status === 'approved').length,
    completed: intentions.filter(i => i.status === 'completed').length,
    rejected:  intentions.filter(i => i.status === 'rejected').length,
    flagged:   intentions.filter(i => i.status === 'flagged').length,
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 anim-fade-up">
          <h1
            className="text-4xl sm:text-5xl font-semibold leading-none text-[#1a3d2e] dark:text-[#e8e3d8]"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Nia za Misa
          </h1>
          <p className="text-sm text-ash dark:text-[#6b9080] mt-2">
            Tazama na simamia nia za Misa zilizotumwa na waumini
          </p>
          <hr className="gold-rule mt-4 max-w-20" />
        </div>

        {/* Filter tabs — scroll on mobile, full on sm+ */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 anim-fade-up anim-delay-1">
          {TABS.map(tab => {
            const active = filter === tab.key;
            const count = statusCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium whitespace-nowrap text-[12px] transition-all shrink-0 ${
                  active
                    ? 'bg-[#1a3d2e] text-white shadow-sm'
                    : 'bg-white dark:bg-[#17291f] text-ash dark:text-[#6b9080] border border-[#e8e3d8] dark:border-[#253d2e] hover:border-[#c4933f] hover:text-[#1a3d2e] dark:hover:text-[#e8e3d8]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    active ? 'bg-white/20 text-white' : 'bg-[#f0ead8] dark:bg-[#1a2e23] text-ash'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>Inapakia…</p>
          </div>
        ) : filteredIntentions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-ash-light dark:text-[#2e4a38] mb-3">assignment</span>
            <p className="text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {filter === 'all' ? 'Hakuna nia za Misa bado' : `Hakuna nia ${STATUS_LABELS[filter]?.toLowerCase() ?? filter}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIntentions.map(intention => (
              <div key={intention.id} className="card p-4 sm:p-5 anim-fade-up">
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className="mt-1.5 shrink-0">
                    <span className={`block w-2 h-2 rounded-full ${STATUS_DOT[intention.status] ?? 'bg-ash-light'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row: meta + badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        {intention.submittedByName && (
                          <p className="text-sm font-semibold text-ink dark:text-[#e8e3d8] truncate">
                            {intention.submittedByName}
                          </p>
                        )}
                        <p className="text-[11px] text-ash dark:text-[#5a8070] mt-0.5">
                          {format(intention.createdAt, 'dd MMM yyyy · HH:mm')}
                          {intention.submittedByPhone && ` · ${intention.submittedByPhone}`}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        intention.status === 'pending'   ? 'badge-pending' :
                        intention.status === 'approved'  ? 'badge-approved' :
                        intention.status === 'flagged'   ? 'badge-flagged' : 'badge-rejected'
                      }`}>
                        {STATUS_LABELS[intention.status] ?? intention.status}
                      </span>
                    </div>

                    {/* Intention text */}
                    <div className="bg-parchment dark:bg-[#1a2e23] rounded-lg px-4 py-3 mb-3">
                      <p className="text-sm text-ink dark:text-[#e8e3d8] leading-relaxed whitespace-pre-wrap">
                        {intention.intentionText}
                      </p>
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {intention.intentionType && (
                        <span className="text-[10px] font-semibold bg-[#f0ead8] dark:bg-[#1a2e23] text-ash dark:text-[#6b9080] px-2 py-0.5 rounded">
                          {INTENTION_TYPE_LABELS[intention.intentionType] ?? intention.intentionType}
                        </span>
                      )}
                      {intention.beneficiaryName && (
                        <span className="text-[10px] bg-[#f0ead8] dark:bg-[#1a2e23] text-ash px-2 py-0.5 rounded">
                          Mnufaika: {intention.beneficiaryName}
                        </span>
                      )}
                      {intention.mpesaConfirmationCode && (
                        <span className="text-[10px] font-mono bg-parchment-deep dark:bg-[#1a2e23] text-ash px-2 py-0.5 rounded border border-[#e8e3d8] dark:border-[#253d2e]">
                          M-Pesa: {intention.mpesaConfirmationCode}
                        </span>
                      )}
                      {intention.mpesaAmount != null && (
                        <span className="text-[10px] bg-parchment-deep dark:bg-[#1a2e23] text-[#065f46] dark:text-[#34d399] px-2 py-0.5 rounded">
                          TZS {intention.mpesaAmount.toLocaleString()}
                        </span>
                      )}
                      {intention.preferredDate && (
                        <span className="text-[10px] bg-parchment-deep dark:bg-[#1a2e23] text-ash px-2 py-0.5 rounded">
                          Tarehe: {format(intention.preferredDate, 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {intention.note && (
                      <div className="bg-[#faf7f0] dark:bg-[#1a2e23] border border-[#e8e3d8] dark:border-[#253d2e] rounded-lg px-3 py-2 mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ash mb-1">Maelezo ya mtumaji</p>
                        <p className="text-sm text-ink-soft dark:text-[#c0bdb6]">{intention.note}</p>
                      </div>
                    )}
                    {intention.adminNotes && (
                      <div className="bg-parchment-deep dark:bg-[#1a2e23] border border-[#c4933f]/30 rounded-lg px-3 py-2 mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c4933f] mb-1">Maelezo ya msimamizi</p>
                        <p className="text-sm text-ink-soft dark:text-[#c0bdb6]">{intention.adminNotes}</p>
                      </div>
                    )}

                    {/* Admin note input */}
                    {(intention.status === 'pending' || intention.status === 'flagged') && (
                      <input
                        type="text"
                        placeholder="Ongeza maelezo ya msimamizi (hiari)…"
                        value={adminNotes[intention.id] ?? ''}
                        onChange={e => setAdminNotes(prev => ({ ...prev, [intention.id]: e.target.value }))}
                        className="input-illuminated mb-3 text-sm"
                      />
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {(intention.status === 'pending' || intention.status === 'flagged') && (
                        <>
                          <button
                            onClick={() => handleStatusChange(intention.id, 'approved')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-semibold rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Idhinisha
                          </button>
                          <button
                            onClick={() => handleStatusChange(intention.id, 'rejected')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[12px] font-semibold rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Kataa
                          </button>
                          {intention.status !== 'flagged' && (
                            <button
                              onClick={() => handleStatusChange(intention.id, 'flagged')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f97316] hover:bg-[#ea6c0a] text-white text-[12px] font-semibold rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">flag</span>
                              Ripoti
                            </button>
                          )}
                        </>
                      )}
                      {intention.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(intention.id, 'completed')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-semibold rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">done_all</span>
                          Kamilisha
                        </button>
                      )}
                      {intention.status !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(intention.id, 'pending')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-ash dark:text-[#6b9080] border border-[#e8e3d8] dark:border-[#253d2e] hover:border-[#c4933f] text-[12px] font-medium rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">undo</span>
                          Rudisha
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
