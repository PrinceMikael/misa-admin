'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Parish, LiturgicalSeason } from '@/types';

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
    name: '',
    nameSwahili: '',
    diocese: '',
    region: '',
    deanery: '',
    address: '',
    description: '',
    history: '',
    patronSaint: '',
    foundedYear: '',
    priestName: '',
    officeHours: '',
    mpesaTillNumber: '',
    mpesaAmount: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    imageUrl: '',
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
        setParish({
          id: parishDoc.id, ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Parish);
        setFormData({
          name: data.name || '',
          nameSwahili: data.nameSwahili || '',
          diocese: data.diocese || '',
          region: data.region || '',
          deanery: data.deanery || '',
          address: data.address || '',
          description: data.description || '',
          history: data.history || '',
          patronSaint: data.patronSaint || '',
          foundedYear: data.foundedYear?.toString() || '',
          priestName: data.priestName || '',
          officeHours: data.officeHours || '',
          mpesaTillNumber: data.mpesaTillNumber || '',
          mpesaAmount: data.mpesaAmount?.toString() || '',
          latitude: data.location?.latitude?.toString() || '',
          longitude: data.location?.longitude?.toString() || '',
          phone: data.phone || '',
          email: data.email || '',
          imageUrl: data.imageUrl || '',
          currentSeason: data.currentSeason || '',
          seasonNote: data.seasonNote || '',
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
    if (!navigator.geolocation) {
      alert('Kivinjari chako hakisaidii GPS. Jaza mikono.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setGettingLocation(false);
      },
      () => {
        alert('Imeshindwa kupata eneo lako. Tafadhali ruhusu GPS au jaza mikono.');
        setGettingLocation(false);
      },
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
      const downloadURL = await getDownloadURL(storageRef);
      setFormData({ ...formData, imageUrl: downloadURL });
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
      const locationChanged =
        formData.latitude !== prevLat || formData.longitude !== prevLng;
      const newLocationStatus =
        locationChanged && formData.latitude && formData.longitude
          ? 'pending'
          : locationStatus;

      const parishData: Record<string, unknown> = {
        name: formData.name,
        diocese: formData.diocese,
        address: formData.address,
        updatedAt: Timestamp.now(),
      };
      if (formData.latitude && formData.longitude) {
        parishData.location = {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        };
        parishData.locationStatus = newLocationStatus;
        if (locationChanged) parishData.locationRejectionNote = null;
      }
      if (formData.nameSwahili) parishData.nameSwahili = formData.nameSwahili;
      if (formData.region) parishData.region = formData.region;
      if (formData.deanery) parishData.deanery = formData.deanery;
      if (formData.description) parishData.description = formData.description;
      if (formData.history) parishData.history = formData.history;
      if (formData.patronSaint) parishData.patronSaint = formData.patronSaint;
      if (formData.foundedYear) parishData.foundedYear = parseInt(formData.foundedYear);
      if (formData.priestName) parishData.priestName = formData.priestName;
      if (formData.officeHours) parishData.officeHours = formData.officeHours;
      if (formData.mpesaTillNumber) parishData.mpesaTillNumber = formData.mpesaTillNumber;
      if (formData.mpesaAmount) parishData.mpesaAmount = parseFloat(formData.mpesaAmount);
      if (formData.phone) parishData.phone = formData.phone;
      if (formData.email) parishData.email = formData.email;
      if (formData.imageUrl) parishData.imageUrl = formData.imageUrl;
      if (formData.currentSeason) parishData.currentSeason = formData.currentSeason;
      else parishData.currentSeason = null;
      if (formData.seasonNote) parishData.seasonNote = formData.seasonNote;
      else parishData.seasonNote = null;

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

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Taarifa za Parokia</h1>
          <p className="text-gray-600 dark:text-gray-400">Simamia taarifa na mawasiliano ya parokia yako.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Taarifa za parokia zimehifadhiwa!
                </p>
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Taarifa za Msingi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jina la Parokia (Kiingereza) <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="St. Peter Parish" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jina la Parokia (Kiswahili)</label>
                  <input type="text" value={formData.nameSwahili} onChange={e => setFormData({...formData, nameSwahili: e.target.value})} className={inputClass} placeholder="Parokia ya Mt. Petro" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jimbo <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.diocese} onChange={e => setFormData({...formData, diocese: e.target.value})} className={inputClass} placeholder="Jimbo Kuu la Dar es Salaam" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mkoa</label>
                  <input type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className={inputClass} placeholder="Dar es Salaam" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dekanati</label>
                  <input type="text" value={formData.deanery} onChange={e => setFormData({...formData, deanery: e.target.value})} className={inputClass} placeholder="Dekanati ya Masaki" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mtakatifu Mlezi</label>
                  <input type="text" value={formData.patronSaint} onChange={e => setFormData({...formData, patronSaint: e.target.value})} className={inputClass} placeholder="Mt. Petro" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mwaka wa Kuanzishwa</label>
                  <input type="number" value={formData.foundedYear} onChange={e => setFormData({...formData, foundedYear: e.target.value})} className={inputClass} placeholder="1954" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Padre Paroko</label>
                  <input type="text" value={formData.priestName} onChange={e => setFormData({...formData, priestName: e.target.value})} className={inputClass} placeholder="Padre Petro Makundi" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Anwani <span className="text-red-500">*</span></label>
                  <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className={inputClass + " resize-none"} placeholder="Masaki, Dar es Salaam, Tanzania" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maelezo Mafupi</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className={inputClass + " resize-none"} placeholder="Maelezo mafupi ya parokia..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Historia ya Parokia</label>
                  <textarea value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} rows={3} className={inputClass + " resize-none"} placeholder="Historia fupi ya parokia..." />
                </div>
              </div>
            </div>

            {/* M-Pesa & Office */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">M-Pesa na Ofisi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Namba ya Till ya M-Pesa</label>
                  <input type="text" value={formData.mpesaTillNumber} onChange={e => setFormData({...formData, mpesaTillNumber: e.target.value})} className={inputClass} placeholder="545454" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kiasi cha Nia (TZS)</label>
                  <input type="number" value={formData.mpesaAmount} onChange={e => setFormData({...formData, mpesaAmount: e.target.value})} className={inputClass} placeholder="5000" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Saa za Ofisi</label>
                  <input type="text" value={formData.officeHours} onChange={e => setFormData({...formData, officeHours: e.target.value})} className={inputClass} placeholder="Jumatatu-Ijumaa: 8:00-16:00" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mahali pa Kanisa</h2>
                {locationStatus === 'approved' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Imeidhinishwa
                  </span>
                )}
                {locationStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    Inasubiri Idhini
                  </span>
                )}
                {locationStatus === 'rejected' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                    Imekataliwa
                  </span>
                )}
              </div>

              {locationStatus === 'rejected' && locationRejectionNote && (
                <div className="mt-2 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <span className="font-medium">Sababu ya kukataliwa:</span> {locationRejectionNote}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                Bonyeza "Pata Eneo Langu" ukiwa kanisani, au jaza mikono. Mabadiliko yatatumwa kwa msimamizi mkuu kwa idhini.
              </p>

              {/* GPS button */}
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="mb-4 inline-flex items-center gap-2 px-4 py-2.5 bg-forest text-white text-sm font-medium rounded-lg hover:bg-forest-mid transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {gettingLocation ? 'progress_activity' : 'my_location'}
                </span>
                {gettingLocation ? 'Inatafuta eneo...' : 'Pata Eneo Langu (GPS)'}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latitude</label>
                  <input
                    type="number" step="any"
                    value={formData.latitude}
                    onChange={e => setFormData({...formData, latitude: e.target.value})}
                    className={inputClass}
                    placeholder="-6.7617"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Longitude</label>
                  <input
                    type="number" step="any"
                    value={formData.longitude}
                    onChange={e => setFormData({...formData, longitude: e.target.value})}
                    className={inputClass}
                    placeholder="39.2634"
                  />
                </div>
              </div>

              {/* Live preview link */}
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
            </div>

            {/* Contact */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mawasiliano</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Namba ya Simu</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+255 XXX XXX XXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barua Pepe</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="info@parokia.com" />
                </div>
              </div>
            </div>

            {/* Liturgical Season */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Kipindi cha Liturujia</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Weka kipindi cha sasa cha Kanisa ili kionyeshwe kwa waumini kwenye programu.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kipindi cha Sasa
                  </label>
                  <select
                    value={formData.currentSeason}
                    onChange={e => setFormData({ ...formData, currentSeason: e.target.value as LiturgicalSeason | '' })}
                    className={inputClass}
                  >
                    <option value="">-- Chagua Kipindi --</option>
                    <option value="ordinary_time">Wakati wa Kawaida</option>
                    <option value="advent">Majilio</option>
                    <option value="christmas">Noeli</option>
                    <option value="lent">Kwaresima</option>
                    <option value="holy_week">Wiki Takatifu</option>
                    <option value="easter">Pasaka</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ujumbe wa Kipindi (hiari)
                  </label>
                  <input
                    type="text"
                    value={formData.seasonNote}
                    onChange={e => setFormData({ ...formData, seasonNote: e.target.value })}
                    className={inputClass}
                    placeholder="Mf: Wiki 3 ya Kwaresima"
                  />
                </div>
              </div>
            </div>

            {/* Parish Image */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Picha ya Parokia</h2>
              {formData.imageUrl && (
                <div className="mb-4">
                  <img src={formData.imageUrl} alt="Parokia" className="w-full h-64 object-cover rounded-lg" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pakia Picha</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className={inputClass} />
                {uploading && <p className="text-sm text-gray-500 mt-2">Inapakia picha...</p>}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Inahifadhi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  <span>Hifadhi Mabadiliko</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
