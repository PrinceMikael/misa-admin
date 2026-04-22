'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type State = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'success';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [tokenDocId, setTokenDocId] = useState('');

  useEffect(() => {
    if (authLoading) return;
    verifyToken();
  }, [token, authLoading]);

  const verifyToken = async () => {
    try {
      const q = query(collection(db, 'invite_tokens'), where('token', '==', token));
      const snap = await getDocs(q);

      if (snap.empty) { setState('invalid'); return; }

      const tokenDoc = snap.docs[0];
      const data = tokenDoc.data();

      if (data.used) { setState('used'); return; }

      const expiresAt = (data.expiresAt as Timestamp).toDate();
      if (new Date() > expiresAt) { setState('expired'); return; }

      setTokenDocId(tokenDoc.id);
      setState('valid');
    } catch {
      setState('invalid');
    }
  };

  const handleAccept = async () => {
    if (!tokenDocId) return;
    try {
      setState('loading');
      await updateDoc(doc(db, 'invite_tokens', tokenDocId), { used: true, usedAt: Timestamp.now() });
      setState('success');
      setTimeout(() => {
        if (user) router.replace('/onboarding');
        else router.replace('/login');
      }, 2000);
    } catch {
      setState('invalid');
    }
  };

  const content: Record<State, { icon: string; color: string; title: string; body: string; action?: string }> = {
    loading: {
      icon: 'progress_activity',
      color: '#c4933f',
      title: 'Inathibitisha…',
      body: 'Tafadhali subiri.',
    },
    valid: {
      icon: 'mark_email_read',
      color: '#059669',
      title: 'Mwaliko Halali!',
      body: 'Umealikwa kuwa Msimamizi wa Parokia kwenye mfumo wa Misa Admin. Bonyeza kitufe hapa chini kukubali.',
      action: 'Kubali Mwaliko',
    },
    expired: {
      icon: 'timer_off',
      color: '#f59e0b',
      title: 'Mwaliko Umeisha Muda',
      body: 'Kiungo hiki kilikuwa halali kwa saa 1 tu na kimeshapita muda wake. Wasiliana na msimamizi mkuu kupata mwaliko mpya.',
    },
    used: {
      icon: 'block',
      color: '#ef4444',
      title: 'Mwaliko Umetumika',
      body: 'Kiungo hiki kimeshatumika. Kila kiungo cha mwaliko ni cha matumizi moja tu. Kama hukutumia wewe mwenyewe, wasiliana na msimamizi mkuu mara moja.',
    },
    invalid: {
      icon: 'error',
      color: '#ef4444',
      title: 'Mwaliko Batili',
      body: 'Kiungo hiki si sahihi au hakipo. Tafadhali angalia kiungo ulichopewa au wasiliana na msimamizi mkuu.',
    },
    success: {
      icon: 'check_circle',
      color: '#059669',
      title: 'Umefanikiwa!',
      body: 'Mwaliko umekubaliwa. Unakupelekwa…',
    },
  };

  const c = content[state];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #1a3d2e 0%, #0e2418 100%)' }}
    >
      {/* Background cross */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
        style={{ fontSize: '28rem', lineHeight: 1, color: 'rgba(196,147,63,0.04)', fontFamily: 'Georgia, serif' }}
        aria-hidden
      >✝</div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(250,247,240,0.97)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
              style={{
                background: 'linear-gradient(135deg, #c4933f, #e2b96a)',
                color: '#1a3d2e',
                fontFamily: 'var(--font-cormorant)',
              }}
            >
              MA
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <span
              className={`material-symbols-outlined text-5xl ${state === 'loading' ? 'animate-spin' : ''}`}
              style={{ color: c.color }}
            >
              {c.icon}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-2xl font-semibold text-[#1a3d2e] mb-2"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            {c.title}
          </h1>

          {/* Body */}
          <p className="text-sm text-[#8a8479] leading-relaxed mb-6">{c.body}</p>

          {/* Gold rule */}
          <hr className="gold-rule mb-6" />

          {/* Action */}
          {state === 'valid' && (
            <button onClick={handleAccept} className="btn-gold w-full justify-center">
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              {c.action}
            </button>
          )}

          {(state === 'expired' || state === 'used' || state === 'invalid') && (
            <a
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-[#c4933f] hover:text-[#b8832e] font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              Rudi kwenye kurasa ya kuingia
            </a>
          )}

          <p className="mt-6 text-[11px] text-[#c4bfb4]">Misa Admin · Usimamizi wa Parokia</p>
        </div>
      </div>
    </div>
  );
}
