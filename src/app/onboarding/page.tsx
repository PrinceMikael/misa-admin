'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const STEPS = ['Karibu', 'Parokia', 'Mahali', 'Mawasiliano'];

export default function OnboardingPage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [form, setForm] = useState({
    name: '',
    nameSwahili: '',
    diocese: '',
    region: '',
    address: '',
    priestName: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
  });

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert('GPS haisaidiwi na kivinjari hiki.'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        update('latitude', pos.coords.latitude.toFixed(7));
        update('longitude', pos.coords.longitude.toFixed(7));
        setGettingLocation(false);
      },
      () => { alert('Imeshindwa kupata eneo. Jaza mikono.'); setGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFinish = async () => {
    if (!user || !userData) return;
    try {
      setSaving(true);
      const parishDoc = await addDoc(collection(db, 'parishes'), {
        name: form.name.trim(),
        nameSwahili: form.nameSwahili.trim() || null,
        diocese: form.diocese.trim(),
        region: form.region.trim() || null,
        address: form.address.trim(),
        priestName: form.priestName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        location: form.latitude && form.longitude
          ? { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) }
          : null,
        locationStatus: form.latitude && form.longitude ? 'pending' : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await updateDoc(doc(db, 'users', user.uid), {
        parishId: parishDoc.id,
        status: 'active',
      });

      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Imeshindwa kuhifadhi. Tafadhali jaribu tena.');
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return form.name.trim() && form.diocese.trim() && form.address.trim();
    if (step === 2) return true;
    if (step === 3) return true;
    return true;
  };

  const inputCls = "w-full px-4 py-3 bg-[#faf7f0] border border-[#d4cfc4] rounded-lg text-[#1c1a17] text-sm focus:outline-none focus:border-[#c4933f] focus:ring-2 focus:ring-[#c4933f]/15 transition-all placeholder:text-[#c4bfb4]";
  const labelCls = "block text-xs font-semibold uppercase tracking-widest text-[#8a8479] mb-2";

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a3d2e 0%, #0e2418 100%)' }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
          style={{ fontSize: '22rem', lineHeight: 1, color: 'rgba(196,147,63,0.05)', fontFamily: 'Georgia, serif' }}
          aria-hidden
        >✝</div>

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
            style={{ background: 'linear-gradient(135deg, #c4933f, #e2b96a)', color: '#1a3d2e', fontFamily: 'var(--font-cormorant)', fontSize: '1rem' }}
          >MA</div>
          <p className="text-white font-semibold" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem' }}>
            Misa Admin
          </p>
        </div>

        <div className="relative z-10">
          {/* Progress steps */}
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-[#c4933f] text-white' :
                  i === step ? 'bg-white text-[#1a3d2e]' :
                  'bg-white/10 text-white/40'
                }`}>
                  {i < step
                    ? <span className="material-symbols-outlined text-[16px]">check</span>
                    : i + 1
                  }
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  i === step ? 'text-white' : i < step ? 'text-[#c4933f]' : 'text-white/30'
                }`}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, #c4933f, transparent)', opacity: 0.4 }} />
          <p className="text-[#4d7a63] text-xs">Hatua {step + 1} kati ya {STEPS.length}</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#faf7f0]">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-6 py-4 border-b border-[#e8e3d8]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #c4933f, #e2b96a)', color: '#1a3d2e', fontFamily: 'var(--font-cormorant)' }}
          >MA</div>
          <span className="text-[#1a3d2e] font-semibold" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem' }}>
            Misa Admin
          </span>
          <span className="ml-auto text-xs text-[#8a8479]">Hatua {step + 1}/{STEPS.length}</span>
        </div>

        <div className="flex-1 flex items-start justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-lg">

            {/* ── Step 0: Welcome ── */}
            {step === 0 && (
              <div className="anim-fade-up">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c4933f] mb-3">Hatua ya 1</p>
                <h1 className="text-4xl font-semibold text-[#1a3d2e] mb-3 leading-tight"
                    style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Karibu, {userData?.displayName?.split(' ')[0] || 'Padre'}!
                </h1>
                <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, #c4933f, transparent)', opacity: 0.5, maxWidth: 80 }} />
                <p className="text-[#8a8479] leading-relaxed mb-4">
                  Umealikwa kuwa Msimamizi wa Parokia kwenye mfumo wa <strong className="text-[#1a3d2e]">Misa Admin</strong>.
                </p>
                <p className="text-[#8a8479] leading-relaxed mb-8">
                  Hatua chache zinaendelea kukusaidia kusanidi parokia yako. Itachukua dakika 2–3 tu. Anza ukiwa tayari.
                </p>
                <div className="p-4 rounded-xl border border-[#e8e3d8] bg-white mb-8">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#c4933f] text-xl mt-0.5">info</span>
                    <div>
                      <p className="text-sm font-semibold text-[#1a3d2e] mb-1">Utahitaji nini:</p>
                      <ul className="text-sm text-[#8a8479] space-y-1">
                        <li>• Jina kamili la parokia</li>
                        <li>• Jimbo (Diocese) ambalo parokia iko</li>
                        <li>• Anwani ya parokia</li>
                        <li>• Eneo (GPS au coordinates) — hiari</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Parish basics ── */}
            {step === 1 && (
              <div className="anim-fade-up">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c4933f] mb-3">Hatua ya 2</p>
                <h1 className="text-4xl font-semibold text-[#1a3d2e] mb-3 leading-tight"
                    style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Taarifa za Parokia
                </h1>
                <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, #c4933f, transparent)', opacity: 0.5, maxWidth: 80 }} />

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Jina la Parokia (Kiingereza) <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                      className={inputCls} placeholder="St. Peter Parish" />
                  </div>
                  <div>
                    <label className={labelCls}>Jina la Parokia (Kiswahili)</label>
                    <input type="text" value={form.nameSwahili} onChange={e => update('nameSwahili', e.target.value)}
                      className={inputCls} placeholder="Parokia ya Mt. Petro" />
                  </div>
                  <div>
                    <label className={labelCls}>Jimbo (Diocese) <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <input type="text" value={form.diocese} onChange={e => update('diocese', e.target.value)}
                      className={inputCls} placeholder="Jimbo Kuu la Dar es Salaam" />
                  </div>
                  <div>
                    <label className={labelCls}>Mkoa</label>
                    <input type="text" value={form.region} onChange={e => update('region', e.target.value)}
                      className={inputCls} placeholder="Dar es Salaam" />
                  </div>
                  <div>
                    <label className={labelCls}>Anwani <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <textarea value={form.address} onChange={e => update('address', e.target.value)}
                      rows={2} className={inputCls + ' resize-none'} placeholder="Masaki, Dar es Salaam, Tanzania" />
                  </div>
                  <div>
                    <label className={labelCls}>Padre Paroko</label>
                    <input type="text" value={form.priestName} onChange={e => update('priestName', e.target.value)}
                      className={inputCls} placeholder="Padre Petro Makundi" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Location ── */}
            {step === 2 && (
              <div className="anim-fade-up">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c4933f] mb-3">Hatua ya 3</p>
                <h1 className="text-4xl font-semibold text-[#1a3d2e] mb-3 leading-tight"
                    style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Mahali pa Kanisa
                </h1>
                <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, #c4933f, transparent)', opacity: 0.5, maxWidth: 80 }} />
                <p className="text-sm text-[#8a8479] mb-6 leading-relaxed">
                  Ukiwa kanisani sasa hivi, bonyeza "Pata Eneo Langu" — simu yako itajaza coordinates otomatiki.
                  Kama kanisa lako lipo kwenye Google Maps, unaweza pia kupata coordinates kutoka hapo.
                  Hatua hii ni ya hiari — unaweza kuruka na kuijaza baadaye.
                </p>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1a3d2e, #254d3a)', color: 'white' }}
                >
                  <span className={`material-symbols-outlined text-[20px] ${gettingLocation ? 'animate-spin' : ''}`}>
                    {gettingLocation ? 'progress_activity' : 'my_location'}
                  </span>
                  {gettingLocation ? 'Inatafuta eneo lako…' : 'Pata Eneo Langu (GPS)'}
                </button>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Latitude</label>
                    <input type="number" step="any" value={form.latitude} onChange={e => update('latitude', e.target.value)}
                      className={inputCls} placeholder="-6.7617" />
                  </div>
                  <div>
                    <label className={labelCls}>Longitude</label>
                    <input type="number" step="any" value={form.longitude} onChange={e => update('longitude', e.target.value)}
                      className={inputCls} placeholder="39.2634" />
                  </div>
                </div>

                {form.latitude && form.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#c4933f] hover:underline font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Thibitisha eneo kwenye Google Maps
                  </a>
                )}

                {(form.latitude || form.longitude) && (
                  <div className="mt-4 p-3 bg-[#fef3c7] rounded-lg border border-[#fde68a]">
                    <p className="text-xs text-[#92400e]">
                      <span className="font-semibold">Kumbuka:</span> Eneo lako litatumwa kwa msimamizi mkuu kwa idhini kabla halijatumika hadharani.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Contact ── */}
            {step === 3 && (
              <div className="anim-fade-up">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#c4933f] mb-3">Hatua ya 4</p>
                <h1 className="text-4xl font-semibold text-[#1a3d2e] mb-3 leading-tight"
                    style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Mawasiliano
                </h1>
                <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, #c4933f, transparent)', opacity: 0.5, maxWidth: 80 }} />
                <p className="text-sm text-[#8a8479] mb-6">Hizi ni za hiari — unaweza kuruka na kuzijaza baadaye kwenye ukurasa wa Taarifa za Parokia.</p>

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Namba ya Simu</label>
                    <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                      className={inputCls} placeholder="+255 XXX XXX XXX" />
                  </div>
                  <div>
                    <label className={labelCls}>Barua Pepe ya Parokia</label>
                    <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      className={inputCls} placeholder="info@parokia.com" />
                  </div>
                </div>

                <div className="mt-8 p-5 rounded-xl border border-[#e8e3d8] bg-white">
                  <p className="text-sm font-semibold text-[#1a3d2e] mb-3" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem' }}>
                    Muhtasari wa Parokia Yako
                  </p>
                  <div className="space-y-2 text-sm text-[#8a8479]">
                    <p><span className="font-medium text-[#1c1a17]">Jina:</span> {form.name}</p>
                    <p><span className="font-medium text-[#1c1a17]">Jimbo:</span> {form.diocese}</p>
                    <p><span className="font-medium text-[#1c1a17]">Anwani:</span> {form.address}</p>
                    {form.priestName && <p><span className="font-medium text-[#1c1a17]">Padre:</span> {form.priestName}</p>}
                    {form.latitude && <p><span className="font-medium text-[#1c1a17]">Eneo:</span> {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className={`flex gap-3 mt-8 ${step === 0 ? 'justify-end' : 'justify-between'}`}>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#d4cfc4] text-[#8a8479] text-sm font-medium hover:border-[#c4933f] hover:text-[#c4933f] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Rudi
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="btn-gold ml-auto"
                >
                  Endelea
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="btn-gold ml-auto"
                >
                  {saving
                    ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Inahifadhi…</>
                    : <><span className="material-symbols-outlined text-[18px]">check_circle</span>Maliza Usanidi</>
                  }
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
