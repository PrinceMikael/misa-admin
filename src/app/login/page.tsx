'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
      setError('Barua pepe au nenosiri si sahihi. Tafadhali jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-dm-sans)' }}>
      {/* Left panel — decorative forest column */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between p-12 relative overflow-hidden grain"
        style={{ background: 'linear-gradient(160deg, #1a3d2e 0%, #0e2418 100%)' }}
      >
        {/* Large decorative cross */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '28rem',
            lineHeight: 1,
            color: 'rgba(196, 147, 63, 0.04)',
            userSelect: 'none',
          }}
          aria-hidden
        >
          ✝
        </div>

        {/* Top ornament */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[#1a3d2e]"
              style={{
                background: 'linear-gradient(135deg, #c4933f, #e2b96a)',
                fontFamily: 'var(--font-cormorant)',
                fontSize: '1rem',
                letterSpacing: '0.06em',
              }}
            >
              MA
            </div>
            <div>
              <p className="text-white font-semibold tracking-wide" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem' }}>
                Misa Admin
              </p>
              <p className="text-[#4d7a63] text-[11px] uppercase tracking-widest font-medium">
                Mfumo wa Parokia
              </p>
            </div>
          </div>
        </div>

        {/* Center quote */}
        <div className="relative z-10 max-w-xs">
          <div className="text-[#c4933f] text-6xl leading-none mb-4 opacity-60" style={{ fontFamily: 'Georgia, serif' }}>"</div>
          <p className="text-white/80 text-xl leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>
            Shangilileni katika Bwana, enyi wenye haki; sifa zinampendeza watu wanyoofu.
          </p>
          <div className="mt-6 h-px" style={{ background: 'linear-gradient(90deg, #c4933f, transparent)', opacity: 0.5 }} />
          <p className="mt-3 text-[#4d7a63] text-xs uppercase tracking-widest font-medium">
            Zaburi 33:1 · Biblia Takatifu
          </p>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-[#4d7a63] text-xs">© 2024 Misa — Haki zote zimehifadhiwa</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-parchment dark:bg-[#0e1f17]">
        <div className="w-full max-w-100">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{
                background: 'linear-gradient(135deg, #c4933f, #e2b96a)',
                color: '#1a3d2e',
                fontFamily: 'var(--font-cormorant)',
                fontSize: '1rem',
              }}
            >
              MA
            </div>
            <p className="text-[#1a3d2e] dark:text-white font-semibold" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem' }}>
              Misa Admin
            </p>
          </div>

          {/* Heading */}
          <div className="mb-8 anim-fade-up">
            <h1
              className="text-4xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8] mb-2 leading-tight"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Karibu tena.
            </h1>
            <p className="text-ash dark:text-[#6b9080] text-sm">
              Ingia ili kuendelea kusimamia parokia yako.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 anim-fade-up anim-delay-1">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40">
                <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5 shrink-0">error</span>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ash dark:text-[#4d7a63] mb-2">
                Barua Pepe
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@parokia.co.tz"
                className="input-illuminated"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ash dark:text-[#4d7a63] mb-2">
                Nenosiri
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-illuminated"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full justify-center mt-6"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Inaingia…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Ingia
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 anim-fade-up anim-delay-2">
            <hr className="gold-rule" />
          </div>

          <p className="text-xs text-[#a09a8e] dark:text-[#4d7a63] text-center anim-fade-up anim-delay-2">
            Huna akaunti? Wasiliana na msimamizi wa jimbo lako.
          </p>
        </div>
      </div>
    </div>
  );
}
