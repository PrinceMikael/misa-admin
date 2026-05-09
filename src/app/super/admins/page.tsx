'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import {
  initializeApp,
  getApps,
  deleteApp,
} from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { db, auth, firebaseConfig } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import SuperAdminRoute from '@/components/SuperAdminRoute';
import { User } from '@/types';

type AdminUser = User & { parishName?: string };

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

const STATUS_LABELS: Record<string, string> = {
  active:   'Amiri',
  invited:  'Amealikwa',
  disabled: 'Amezuiwa',
};

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  invited:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  disabled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const labelClass = 'block text-[11px] uppercase tracking-wider font-semibold text-[#1a3d2e]/60 dark:text-[#e8e3d8]/60 mb-1.5';

export default function SuperAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Invite state ──
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Resend state ──
  const [resendTarget, setResendTarget] = useState<AdminUser | null>(null);
  const [resending, setResending] = useState(false);
  const [resendToken, setResendToken] = useState('');
  const [resendCopied, setResendCopied] = useState(false);

  // ── Action state ──
  const [actionTarget, setActionTarget] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<'disable' | 'enable' | 'delete' | null>(null);
  const [actioning, setActioning] = useState(false);

  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminSnap, parishSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'parishes')),
      ]);

      const parishMap: Record<string, string> = {};
      parishSnap.docs.forEach(d => { parishMap[d.id] = d.data().name; });

      const adminList = adminSnap.docs
        .filter(d => d.data().role === 'PARISH_ADMIN')
        .map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
          parishName: d.data().parishId
            ? (parishMap[d.data().parishId] || 'Parokia Haijulikani')
            : undefined,
        })) as AdminUser[];

      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Invite ──
  const openInvite = () => {
    setInviteEmail('');
    setInviteDisplayName('');
    setInviteError('');
    setInviteToken('');
    setCopied(false);
    setShowInviteModal(true);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteError('');
    setInviteToken('');
    setCopied(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);

    const SECONDARY_APP_NAME = 'misa-invite-secondary';
    let secondaryApp = getApps().find(a => a.name === SECONDARY_APP_NAME);
    const createdSecondary = !secondaryApp;
    if (!secondaryApp) secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const { user: newUser } = await createUserWithEmailAndPassword(
        secondaryAuth, inviteEmail.trim(), tempPassword
      );

      const token = generateToken();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));

      await Promise.all([
        setDoc(doc(db, 'users', newUser.uid), {
          email: inviteEmail.trim().toLowerCase(),
          displayName: inviteDisplayName.trim() || null,
          role: 'PARISH_ADMIN',
          parishId: null,
          status: 'invited',
          createdAt: Timestamp.now(),
        }),
        addDoc(collection(db, 'invite_tokens'), {
          token,
          uid: newUser.uid,
          email: inviteEmail.trim().toLowerCase(),
          expiresAt,
          used: false,
          createdAt: Timestamp.now(),
        }),
        sendPasswordResetEmail(secondaryAuth, inviteEmail.trim()),
      ]);

      await secondaryAuth.signOut();
      setInviteToken(token);
      await loadData();
    } catch (error: unknown) {
      let msg = 'Imeshindwa kutuma mwaliko. Tafadhali jaribu tena.';
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) msg = 'Barua pepe hii tayari inatumika.';
        else if (error.message.includes('invalid-email')) msg = 'Barua pepe si sahihi.';
      }
      setInviteError(msg);
    } finally {
      if (createdSecondary && secondaryApp) await deleteApp(secondaryApp);
      setInviting(false);
    }
  };

  // ── Resend ──
  const handleResend = async (admin: AdminUser) => {
    setResendTarget(admin);
    setResending(true);
    setResendToken('');
    setResendCopied(false);

    try {
      const oldSnap = await getDocs(query(
        collection(db, 'invite_tokens'),
        where('uid', '==', admin.id)
      ));
      const invalidations = oldSnap.docs
        .filter(d => !d.data().used)
        .map(d => updateDoc(doc(db, 'invite_tokens', d.id), {
          used: true,
          usedAt: Timestamp.now(),
        }));
      await Promise.all(invalidations);

      const token = generateToken();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));
      await addDoc(collection(db, 'invite_tokens'), {
        token,
        uid: admin.id,
        email: admin.email,
        expiresAt,
        used: false,
        createdAt: Timestamp.now(),
      });

      await sendPasswordResetEmail(auth, admin.email);
      setResendToken(token);
    } catch (err) {
      console.error('Resend error:', err);
      alert('Imeshindwa kutuma mwaliko upya. Tafadhali jaribu tena.');
      setResendTarget(null);
    } finally {
      setResending(false);
    }
  };

  const closeResendModal = () => {
    setResendTarget(null);
    setResendToken('');
    setResendCopied(false);
  };

  // ── WhatsApp message builder ──
  const buildWhatsappMessage = (email: string, name: string | null | undefined, token: string) =>
`Habari ${name || ''},

Umealikwa kuwa Msimamizi wa Parokia kwenye mfumo wa *Misa Admin*.

📧 Barua pepe yako: ${email}
🔐 Hatua 1: Angalia barua pepe yako — utapata ujumbe wa kuweka nenosiri. Bonyeza kiungo ndani yake.
🔗 Hatua 2: Baada ya kuweka nenosiri na kuingia, bonyeza kiungo hiki cha mwaliko (halali kwa saa 1 tu):
${typeof window !== 'undefined' ? window.location.origin : 'https://misa-admin.vercel.app'}/invite/${token}

⚠️ Kiungo hiki ni cha matumizi moja tu. Usikishirikishe mtu yeyote.

Karibu sana kwenye familia ya Misa! 🙏`;

  const copyMessage = (email: string, name: string | null | undefined, token: string, setCopiedFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(buildWhatsappMessage(email, name, token));
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2500);
  };

  // ── Actions (disable / enable / delete) ──
  const confirmAction = (admin: AdminUser, type: 'disable' | 'enable' | 'delete') => {
    setActionTarget(admin);
    setActionType(type);
  };

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    try {
      setActioning(true);
      if (actionType === 'delete') {
        await deleteDoc(doc(db, 'users', actionTarget.id));
      } else {
        await updateDoc(doc(db, 'users', actionTarget.id), {
          status: actionType === 'disable' ? 'disabled' : 'active',
        });
      }
      setActionTarget(null);
      setActionType(null);
      await loadData();
    } catch (error) {
      console.error('Action error:', error);
      alert('Imeshindwa. Tafadhali jaribu tena.');
    } finally {
      setActioning(false);
    }
  };

  const filtered = admins.filter(a =>
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.parishName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminRoute>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6 anim-fade-up">
            <div>
              <h1
                className="text-4xl sm:text-5xl font-semibold leading-none text-[#1a3d2e] dark:text-[#e8e3d8]"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Wasimamizi wa Parokia
              </h1>
              <p className="text-sm text-ash dark:text-[#6b9080] mt-2">
                {loading ? '...' : `Wasimamizi ${admins.length} wameandikishwa`}
              </p>
              <hr className="gold-rule mt-4 max-w-20" />
            </div>
            <button onClick={openInvite} className="btn-gold shrink-0 mt-1">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span className="hidden sm:inline">Alika Msimamizi</span>
              <span className="sm:hidden">Alika</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ash text-xl pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Tafuta msimamizi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-illuminated pl-10"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-[#e8e3d8] dark:border-[#253d2e]" />
                <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card rounded-2xl flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-ash-light dark:text-[#2e4a38] mb-3">manage_accounts</span>
              <p className="text-ash italic mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
                {search ? 'Hakuna msimamizi anayelingana na utafutaji.' : 'Bado hakuna msimamizi aliyealikwa.'}
              </p>
              {!search && (
                <button onClick={openInvite} className="btn-gold">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Alika wa Kwanza
                </button>
              )}
            </div>
          ) : (
            <div className="card rounded-xl overflow-hidden">

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e3d8] dark:border-[#253d2e]">
                      {['Msimamizi', 'Parokia', 'Hali', 'Tarehe ya Kujiandikisha', ''].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-ash">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e3d8] dark:divide-[#253d2e]">
                    {filtered.map(admin => {
                      const status = admin.status || 'active';
                      return (
                        <tr key={admin.id} className="hover:bg-parchment/50 dark:hover:bg-[#1a2e23]/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#1a3d2e]/10 dark:bg-[#e8e3d8]/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#1a3d2e] dark:text-[#e8e3d8] text-lg">person</span>
                              </div>
                              <div>
                                <p className="font-medium text-[#1a3d2e] dark:text-[#e8e3d8] text-sm">
                                  {admin.displayName || '—'}
                                </p>
                                <p className="text-xs text-ash">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#1a3d2e]/80 dark:text-[#e8e3d8]/70">
                            {admin.parishName ?? (
                              <span className="italic text-ash">Haijaunganishwa</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.active}`}>
                              {STATUS_LABELS[status] || status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-ash">
                            {admin.createdAt.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {status === 'invited' && (
                                <button
                                  onClick={() => handleResend(admin)}
                                  title="Tuma mwaliko upya"
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
                                </button>
                              )}
                              {status === 'disabled' ? (
                                <button
                                  onClick={() => confirmAction(admin, 'enable')}
                                  title="Wezesha"
                                  className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">check_circle</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => confirmAction(admin, 'disable')}
                                  title="Zuia"
                                  className="p-2 rounded-lg text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">block</span>
                                </button>
                              )}
                              <button
                                onClick={() => confirmAction(admin, 'delete')}
                                title="Futa"
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-[#e8e3d8] dark:divide-[#253d2e]">
                {filtered.map(admin => {
                  const status = admin.status || 'active';
                  return (
                    <div key={admin.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#1a3d2e]/10 dark:bg-[#e8e3d8]/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#1a3d2e] dark:text-[#e8e3d8]">person</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#1a3d2e] dark:text-[#e8e3d8] text-sm truncate">
                              {admin.displayName || admin.email}
                            </p>
                            {admin.displayName && (
                              <p className="text-xs text-ash truncate">{admin.email}</p>
                            )}
                            <p className="text-xs text-ash mt-0.5">
                              {admin.parishName ?? <span className="italic">Haijaunganishwa</span>}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.active}`}>
                          {STATUS_LABELS[status] || status}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {status === 'invited' && (
                          <button
                            onClick={() => handleResend(admin)}
                            disabled={resending && resendTarget?.id === admin.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-base">forward_to_inbox</span>
                            Tuma Upya
                          </button>
                        )}
                        {status === 'disabled' ? (
                          <button
                            onClick={() => confirmAction(admin, 'enable')}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900"
                          >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Wezesha
                          </button>
                        ) : (
                          <button
                            onClick={() => confirmAction(admin, 'disable')}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900"
                          >
                            <span className="material-symbols-outlined text-base">block</span>
                            Zuia
                          </button>
                        )}
                        <button
                          onClick={() => confirmAction(admin, 'delete')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                          Futa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Invite Modal ── */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#e8e3d8] dark:border-[#253d2e]">
              <div className="px-6 py-4 border-b border-[#e8e3d8] dark:border-[#253d2e] flex items-center justify-between">
                <h2
                  className="text-2xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  Alika Msimamizi Mpya
                </h2>
                <button
                  onClick={closeInviteModal}
                  className="p-2 rounded-xl text-ash hover:text-[#1a3d2e] dark:hover:text-[#e8e3d8] hover:bg-parchment dark:hover:bg-[#253d2e]/50 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {inviteToken ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">mark_email_read</span>
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">Mwaliko Umetumwa!</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                        Barua pepe imetumwa kwa <span className="font-medium">{inviteEmail}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">timer</span>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Kiungo halali kwa saa 1 tu — matumizi moja
                      </p>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-mono break-all bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded-lg">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{inviteToken}
                    </p>
                  </div>

                  <div className="p-4 bg-parchment dark:bg-[#1a2e23] rounded-xl border border-[#e8e3d8] dark:border-[#253d2e]">
                    <p className={`${labelClass} mb-3`}>
                      Ujumbe wa WhatsApp / SMS
                    </p>
                    <pre className="text-xs text-[#1a3d2e] dark:text-[#e8e3d8] whitespace-pre-wrap leading-relaxed font-sans">
                      {buildWhatsappMessage(inviteEmail, inviteDisplayName, inviteToken)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyMessage(inviteEmail, inviteDisplayName, inviteToken, setCopied)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-mid transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Imenakiliwa!' : 'Nakili Ujumbe'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="w-full px-4 py-2.5 border border-[#e8e3d8] dark:border-[#253d2e] text-ash font-medium rounded-xl hover:bg-parchment dark:hover:bg-[#253d2e]/50 transition-colors"
                  >
                    Funga
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="p-6 space-y-4">
                  <p className="text-sm text-ash">
                    Msimamizi atapata barua pepe ya kuweka nenosiri na kiungo cha mwaliko cha matumizi moja.
                  </p>

                  {inviteError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>
                      Barua Pepe <span className="text-[#c4933f]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="input-illuminated"
                      placeholder="padre@parokia.com"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Jina Kamili</label>
                    <input
                      type="text"
                      value={inviteDisplayName}
                      onChange={e => setInviteDisplayName(e.target.value)}
                      className="input-illuminated"
                      placeholder="Padre Petro Makundi"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeInviteModal}
                      className="flex-1 px-4 py-2.5 border border-[#e8e3d8] dark:border-[#253d2e] text-ash font-medium rounded-xl hover:bg-parchment dark:hover:bg-[#253d2e]/50 transition-colors"
                    >
                      Ghairi
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex-1 btn-gold justify-center disabled:opacity-50"
                    >
                      {inviting
                        ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>Inatuma…</>
                        : <><span className="material-symbols-outlined text-base">send</span>Tuma Mwaliko</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── Resend Modal ── */}
        {resendTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#e8e3d8] dark:border-[#253d2e]">
              <div className="px-6 py-4 border-b border-[#e8e3d8] dark:border-[#253d2e] flex items-center justify-between">
                <h2
                  className="text-2xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  Tuma Mwaliko Upya
                </h2>
                <button
                  onClick={closeResendModal}
                  disabled={resending}
                  className="p-2 rounded-xl text-ash hover:text-[#1a3d2e] dark:hover:text-[#e8e3d8] hover:bg-parchment dark:hover:bg-[#253d2e]/50 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6">
                {resending ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full border-2 border-[#e8e3d8] dark:border-[#253d2e]" />
                      <div className="absolute inset-0 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                    </div>
                    <p className="text-sm text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>Inatuma mwaliko mpya…</p>
                  </div>
                ) : resendToken ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">forward_to_inbox</span>
                      <div>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Mwaliko Mpya Umetumwa!</p>
                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                          Kwa <span className="font-medium">{resendTarget.email}</span> — mwaliko wa zamani umebatilishwa
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">timer</span>
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                          Kiungo kipya halali kwa saa 1 tu
                        </p>
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-mono break-all bg-amber-100 dark:bg-amber-900/40 px-3 py-2 rounded-lg">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{resendToken}
                      </p>
                    </div>

                    <div className="p-4 bg-parchment dark:bg-[#1a2e23] rounded-xl border border-[#e8e3d8] dark:border-[#253d2e]">
                      <p className={`${labelClass} mb-3`}>
                        Ujumbe wa WhatsApp / SMS
                      </p>
                      <pre className="text-xs text-[#1a3d2e] dark:text-[#e8e3d8] whitespace-pre-wrap leading-relaxed font-sans">
                        {buildWhatsappMessage(resendTarget.email, resendTarget.displayName, resendToken)}
                      </pre>
                      <button
                        type="button"
                        onClick={() => copyMessage(resendTarget.email, resendTarget.displayName, resendToken, setResendCopied)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-mid transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">{resendCopied ? 'check' : 'content_copy'}</span>
                        {resendCopied ? 'Imenakiliwa!' : 'Nakili Ujumbe'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={closeResendModal}
                      className="w-full px-4 py-2.5 border border-[#e8e3d8] dark:border-[#253d2e] text-ash font-medium rounded-xl hover:bg-parchment dark:hover:bg-[#253d2e]/50 transition-colors"
                    >
                      Funga
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ── Action Confirmation Modal ── */}
        {actionTarget && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card rounded-2xl shadow-2xl border border-[#e8e3d8] dark:border-[#253d2e] w-full max-w-sm p-6">
              <div className={`flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4 ${
                actionType === 'delete'   ? 'bg-red-100 dark:bg-red-900/30' :
                actionType === 'disable'  ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                            'bg-green-100 dark:bg-green-900/30'
              }`}>
                <span className={`material-symbols-outlined text-3xl ${
                  actionType === 'delete'   ? 'text-red-600 dark:text-red-400' :
                  actionType === 'disable'  ? 'text-yellow-600 dark:text-yellow-400' :
                                              'text-green-600 dark:text-green-400'
                }`}>
                  {actionType === 'delete' ? 'delete_forever' : actionType === 'disable' ? 'block' : 'check_circle'}
                </span>
              </div>

              <h3
                className="text-2xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] text-center"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                {actionType === 'delete' ? 'Futa Msimamizi?' : actionType === 'disable' ? 'Zuia Msimamizi?' : 'Wezesha Msimamizi?'}
              </h3>

              <p className="text-sm text-ash text-center mt-2">
                {actionType === 'delete' ? 'Una uhakika unataka kufuta akaunti ya' :
                 actionType === 'disable' ? 'Una uhakika unataka kumzuia' : 'Una uhakika unataka kumwezesha'}{' '}
                <span className="font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]">
                  {actionTarget.displayName || actionTarget.email}
                </span>
                {actionType === 'delete' ? '? Hatua hii haiwezi kutenduliwa.' : '?'}
              </p>

              {actionType === 'delete' && (
                <p className="mt-3 text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                  Kumbuka: akaunti ya barua pepe itabaki. Kutuma mwaliko kwa barua pepe hii tena haitafanikiwa — tumia &quot;Tuma Upya&quot; badala yake.
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setActionTarget(null); setActionType(null); }}
                  disabled={actioning}
                  className="flex-1 px-4 py-2.5 border border-[#e8e3d8] dark:border-[#253d2e] text-ash font-medium rounded-xl hover:bg-parchment dark:hover:bg-[#253d2e]/50 transition-colors disabled:opacity-50"
                >
                  Ghairi
                </button>
                <button
                  onClick={handleAction}
                  disabled={actioning}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl transition-colors disabled:opacity-50 ${
                    actionType === 'delete'  ? 'bg-red-600 hover:bg-red-700' :
                    actionType === 'disable' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                               'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actioning
                    ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    : 'Ndio, Endelea'}
                </button>
              </div>
            </div>
          </div>
        )}

      </DashboardLayout>
    </SuperAdminRoute>
  );
}
