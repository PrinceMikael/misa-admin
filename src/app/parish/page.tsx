'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Parish, LiturgicalSeason } from '@/types';

const SEASON_OPTIONS = [
  { value: 'ordinary_time', label: 'Wakati wa Kawaida' },
  { value: 'advent',        label: 'Majilio' },
  { value: 'christmas',     label: 'Noeli' },
  { value: 'lent',          label: 'Kwaresima' },
  { value: 'holy_week',     label: 'Wiki Takatifu' },
  { value: 'easter',        label: 'Pasaka' },
];

export default function ParishPage() {
  const { userData } = useAuth();
  const [parish, setParish] = useState<Parish | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<Parish['locationStatus']>(undefined);
  const [locationRejectionNote, setLocationRejectionNote] = useState('');

  const [formData, setFormData] = useState({
    name: '', nameSwahili: '', diocese: '', region: '', deanery: '',
    address: '', description: '', history: '', patronSaint: '', foundedYear: '',
    priestName: '', officeHours: '', mpesaTillNumber: '', mpesaAmount: '',
    latitude: '', longitude: '', phone: '', email: '', imageUrl: '',
    currentSeason: '' as LiturgicalSeason | '',
    seasonNote: '',
  });

  useEffect(() => {
    if (!userData) return;
    if (userData.parishId) loadParish();
    else setLoading(false);
  }, [userData]);

  const loadParish = async () => {
    if (!userData?.parishId) return;
    try {
      setLoading(true);
      const parishDoc = await getDoc(doc(db, 'parishes', userData.parishId));
      if (parishDoc.exists()) {
        const data = parishDoc.data();
        setParish({ id: parishDoc.id, ...data, createdAt: data.createdAt?.toDate() || new Date(), updatedAt: data.updatedAt?.toDate() || new Date() } as Parish);
        setFormData({
          name: data.name || '', nameSwahili: data.nameSwahili || '',
          diocese: data.diocese || '', region: data.region || '', deanery: data.deanery || '',
          address: data.address || '', description: data.description || '',
          history: data.history || '', patronSaint: data.patronSaint || '',
          foundedYear: data.foundedYear?.toString() || '', priestName: data.priestName || '',
          officeHours: data.officeHours || '', mpesaTillNumber: data.mpesaTillNumber || '',
          mpesaAmount: data.mpesaAmount?.toString() || '',
          latitude: data.location?.latitude?.toString() || '',
          longitude: data.location?.longitude?.toString() || '',
          phone: data.phone || '', email: data.email || '', imageUrl: data.imageUrl || '',
          currentSeason: data.currentSeason || '', seasonNote: data.seasonNote || '',
        });
        setLocationStatus(data.locationStatus || undefined);
        setLocationRejectionNote(data.locationRejectionNote || '');
      }
    } catch (error) {
      console.error('Error loading parish:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { alert('Kivinjari chako hakisaidii GPS. Jaza mikono.'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setGettingLocation(false);
      },
      () => { alert('Imeshindwa kupata eneo lako. Tafadhali ruhusu GPS au jaza mikono.'); setGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.parishId) return;
    try {
      setUploading(true);
      const storageRef = ref(storage, `parishes/${userData.parishId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      setFormData(prev => ({ ...prev, imageUrl: await getDownloadURL(storageRef) }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Imeshindwa kupakia picha. Tafadhali jaribu tena.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.parishId) return;
    try {
      setSaving(true);
      setSuccess(false);
      const prevLat = parish?.location?.latitude?.toString() || '';
      const prevLng = parish?.location?.longitude?.toString() || '';
      const locationChanged = formData.latitude !== prevLat || formData.longitude !== prevLng;
      const newLocationStatus = locationChanged && formData.latitude && formData.longitude ? 'pending' : locationStatus;

      const parishData: Record<string, unknown> = {
        name: formData.name, diocese: formData.diocese, address: formData.address,
        updatedAt: Timestamp.now(),
      };
      if (formData.latitude && formData.longitude) {
        parishData.location = { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) };
        parishData.locationStatus = newLocationStatus;
        if (locationChanged) parishData.locationRejectionNote = null;
      }
      if (formData.nameSwahili)    parishData.nameSwahili   = formData.nameSwahili;
      if (formData.region)         parishData.region        = formData.region;
      if (formData.deanery)        parishData.deanery       = formData.deanery;
      if (formData.description)    parishData.description   = formData.description;
      if (formData.history)        parishData.history       = formData.history;
      if (formData.patronSaint)    parishData.patronSaint   = formData.patronSaint;
      if (formData.foundedYear)    parishData.foundedYear   = parseInt(formData.foundedYear);
      if (formData.priestName)     parishData.priestName    = formData.priestName;
      if (formData.officeHours)    parishData.officeHours   = formData.officeHours;
      if (formData.mpesaTillNumber) parishData.mpesaTillNumber = formData.mpesaTillNumber;
      if (formData.mpesaAmount)    parishData.mpesaAmount   = parseFloat(formData.mpesaAmount);
      if (formData.phone)          parishData.phone         = formData.phone;
      if (formData.email)          parishData.email         = formData.email;
      if (formData.imageUrl)       parishData.imageUrl      = formData.imageUrl;
      parishData.currentSeason = formData.currentSeason || null;
      parishData.seasonNote    = formData.seasonNote    || null;

      if (parish) {
        await updateDoc(doc(db, 'parishes', userData.parishId), parishData);
      } else {
        await setDoc(doc(db, 'parishes', userData.parishId), { ...parishData, createdAt: Timestamp.now() });
      }
      setSuccess(true);
      loadParish();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving parish:', error);
      alert('Imeshindwa kuhifadhi. Tafadhali jaribu tena.');
    } finally {
      setSaving(false);
    }
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
      {children}
    </label>
  );

  const SectionCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]" style={{ fontFamily: 'var(--font-cormorant)' }}>
        {title}
      </h2>
      {subtitle && <p className="text-[12px] text-ash dark:text-[#5a8070] mt-1 mb-3">{subtitle}</p>}
      <hr className="gold-rule my-3" />
      {children}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6 anim-fade-up">
          <h1
            className="text-4xl sm:text-5xl font-semibold leading-none text-[#1a3d2e] dark:text-[#e8e3d8]"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Taarifa za Parokia
          </h1>
          <p className="text-sm text-ash dark:text-[#6b9080] mt-2">
            Simamia taarifa na mawasiliano ya parokia yako
          </p>
          <hr className="gold-rule mt-4 max-w-20" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>Inapakia…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {success && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#d1fae5] dark:bg-[#065f46]/20 border border-[#10b981]/30">
                <span className="material-symbols-outlined text-[#10b981] text-[20px]">check_circle</span>
                <p className="text-sm font-medium text-[#065f46] dark:text-[#34d399]">
                  Taarifa za parokia zimehifadhiwa!
                </p>
              </div>
            )}

            {/* Basic Info */}
            <SectionCard title="Taarifa za Msingi">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Jina la Parokia (Kiingereza) <span className="text-[#c4933f]">*</span></Label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-illuminated" placeholder="St. Peter Parish" />
                </div>
                <div>
                  <Label>Jina la Parokia (Kiswahili)</Label>
                  <input type="text" value={formData.nameSwahili} onChange={e => setFormData({ ...formData, nameSwahili: e.target.value })} className="input-illuminated" placeholder="Parokia ya Mt. Petro" />
                </div>
                <div>
                  <Label>Jimbo <span className="text-[#c4933f]">*</span></Label>
                  <input type="text" required value={formData.diocese} onChange={e => setFormData({ ...formData, diocese: e.target.value })} className="input-illuminated" placeholder="Jimbo Kuu la Dar es Salaam" />
                </div>
                <div>
                  <Label>Mkoa</Label>
                  <input type="text" value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} className="input-illuminated" placeholder="Dar es Salaam" />
                </div>
                <div>
                  <Label>Dekanati</Label>
                  <input type="text" value={formData.deanery} onChange={e => setFormData({ ...formData, deanery: e.target.value })} className="input-illuminated" placeholder="Dekanati ya Masaki" />
                </div>
                <div>
                  <Label>Mtakatifu Mlezi</Label>
                  <input type="text" value={formData.patronSaint} onChange={e => setFormData({ ...formData, patronSaint: e.target.value })} className="input-illuminated" placeholder="Mt. Petro" />
                </div>
                <div>
                  <Label>Mwaka wa Kuanzishwa</Label>
                  <input type="number" value={formData.foundedYear} onChange={e => setFormData({ ...formData, foundedYear: e.target.value })} className="input-illuminated" placeholder="1954" />
                </div>
                <div>
                  <Label>Padre Paroko</Label>
                  <input type="text" value={formData.priestName} onChange={e => setFormData({ ...formData, priestName: e.target.value })} className="input-illuminated" placeholder="Padre Petro Makundi" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Anwani <span className="text-[#c4933f]">*</span></Label>
                  <textarea required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} className="input-illuminated resize-none" placeholder="Masaki, Dar es Salaam, Tanzania" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Maelezo Mafupi</Label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="input-illuminated resize-none" placeholder="Maelezo mafupi ya parokia…" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Historia ya Parokia</Label>
                  <textarea value={formData.history} onChange={e => setFormData({ ...formData, history: e.target.value })} rows={3} className="input-illuminated resize-none" placeholder="Historia fupi ya parokia…" />
                </div>
              </div>
            </SectionCard>

            {/* M-Pesa & Office */}
            <SectionCard title="M-Pesa na Ofisi">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Namba ya Till ya M-Pesa</Label>
                  <input type="text" value={formData.mpesaTillNumber} onChange={e => setFormData({ ...formData, mpesaTillNumber: e.target.value })} className="input-illuminated" placeholder="545454" />
                </div>
                <div>
                  <Label>Kiasi cha Nia (TZS)</Label>
                  <input type="number" value={formData.mpesaAmount} onChange={e => setFormData({ ...formData, mpesaAmount: e.target.value })} className="input-illuminated" placeholder="5000" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Saa za Ofisi</Label>
                  <input type="text" value={formData.officeHours} onChange={e => setFormData({ ...formData, officeHours: e.target.value })} className="input-illuminated" placeholder="Jumatatu–Ijumaa: 8:00–16:00" />
                </div>
              </div>
            </SectionCard>

            {/* Location */}
            <SectionCard
              title="Mahali pa Kanisa"
              subtitle="Bonyeza 'Pata Eneo Langu' ukiwa kanisani, au jaza mikono. Mabadiliko yatatumwa kwa msimamizi mkuu kwa idhini."
            >
              {/* Status badge */}
              {locationStatus && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold mb-4 ${
                  locationStatus === 'approved' ? 'bg-[#d1fae5] dark:bg-[#065f46]/20 text-[#065f46] dark:text-[#34d399]' :
                  locationStatus === 'pending'  ? 'bg-[#fef3c7] dark:bg-[#92400e]/20 text-[#92400e] dark:text-[#fbbf24]' :
                  'bg-[#fee2e2] dark:bg-[#991b1b]/20 text-[#991b1b] dark:text-[#f87171]'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {locationStatus === 'approved' ? 'verified' : locationStatus === 'pending' ? 'schedule' : 'cancel'}
                  </span>
                  {locationStatus === 'approved' ? 'Imeidhinishwa' : locationStatus === 'pending' ? 'Inasubiri Idhini' : 'Imekataliwa'}
                </div>
              )}

              {locationStatus === 'rejected' && locationRejectionNote && (
                <div className="mb-4 p-3 bg-[#fee2e2] dark:bg-[#991b1b]/10 rounded-xl border border-[#f87171]/30">
                  <p className="text-sm text-[#991b1b] dark:text-[#f87171]">
                    <span className="font-semibold">Sababu ya kukataliwa:</span> {locationRejectionNote}
                  </p>
                </div>
              )}

              {/* GPS button */}
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="w-full sm:w-auto mb-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1a3d2e, #254d3a)', color: 'white' }}
              >
                <span className={`material-symbols-outlined text-[18px] ${gettingLocation ? 'animate-spin' : ''}`}>
                  {gettingLocation ? 'progress_activity' : 'my_location'}
                </span>
                {gettingLocation ? 'Inatafuta eneo…' : 'Pata Eneo Langu (GPS)'}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} className="input-illuminated" placeholder="-6.7617" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} className="input-illuminated" placeholder="39.2634" />
                </div>
              </div>

              {formData.latitude && formData.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#c4933f] hover:underline font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Thibitisha eneo kwenye Google Maps
                </a>
              )}
            </SectionCard>

            {/* Contact */}
            <SectionCard title="Mawasiliano">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Namba ya Simu</Label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-illuminated" placeholder="+255 XXX XXX XXX" />
                </div>
                <div>
                  <Label>Barua Pepe</Label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-illuminated" placeholder="info@parokia.com" />
                </div>
              </div>
            </SectionCard>

            {/* Liturgical Season */}
            <SectionCard title="Kipindi cha Liturujia" subtitle="Weka kipindi cha sasa cha Kanisa ili kionyeshwe kwa waumini kwenye programu.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Kipindi cha Sasa</Label>
                  <select
                    value={formData.currentSeason}
                    onChange={e => setFormData({ ...formData, currentSeason: e.target.value as LiturgicalSeason | '' })}
                    className="input-illuminated"
                  >
                    <option value="">-- Chagua Kipindi --</option>
                    {SEASON_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Ujumbe wa Kipindi (hiari)</Label>
                  <input type="text" value={formData.seasonNote} onChange={e => setFormData({ ...formData, seasonNote: e.target.value })} className="input-illuminated" placeholder="Mf: Wiki 3 ya Kwaresima" />
                </div>
              </div>
            </SectionCard>

            {/* Parish Image */}
            <SectionCard title="Picha ya Parokia">
              {formData.imageUrl && (
                <div className="mb-4 relative">
                  <img src={formData.imageUrl} alt="Parokia" className="w-full h-48 sm:h-64 object-cover rounded-xl" />
                </div>
              )}
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-colors ${
                uploading
                  ? 'opacity-50 cursor-not-allowed border-[#e8e3d8] dark:border-[#253d2e]'
                  : 'border-[#d4cfc4] dark:border-[#253d2e] hover:border-[#c4933f] hover:bg-[#c4933f]/5'
              }`}>
                <span className="material-symbols-outlined text-[22px] text-ash">add_photo_alternate</span>
                <span className="text-sm text-ash dark:text-[#6b9080]">
                  {uploading ? 'Inapakia picha…' : formData.imageUrl ? 'Badilisha picha' : 'Chagua picha ya parokia'}
                </span>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
              </label>
            </SectionCard>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full btn-gold justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Inahifadhi…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Hifadhi Mabadiliko
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
