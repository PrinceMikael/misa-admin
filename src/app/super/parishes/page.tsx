'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import SuperAdminRoute from '@/components/SuperAdminRoute';
import { Parish } from '@/types';

const emptyForm = {
  name: '',
  nameSwahili: '',
  diocese: '',
  region: '',
  deanery: '',
  address: '',
  priestName: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  mpesaTillNumber: '',
};

type FormData = typeof emptyForm;

export default function SuperParishesPage() {
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingParish, setEditingParish] = useState<Parish | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<Parish | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [locationTarget, setLocationTarget] = useState<Parish | null>(null);
  const [locationAction, setLocationAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [processingLocation, setProcessingLocation] = useState(false);

  const [search, setSearch] = useState('');

  const loadParishes = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'parishes'), orderBy('name'));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as Parish[];
      setParishes(data);
    } catch (error) {
      console.error('Error loading parishes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParishes();
  }, []);

  const openCreate = () => {
    setEditingParish(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (parish: Parish) => {
    setEditingParish(parish);
    setFormData({
      name: parish.name || '',
      nameSwahili: parish.nameSwahili || '',
      diocese: parish.diocese || '',
      region: parish.region || '',
      deanery: parish.deanery || '',
      address: parish.address || '',
      priestName: parish.priestName || '',
      phone: parish.phone || '',
      email: parish.email || '',
      latitude: parish.location?.latitude?.toString() || '',
      longitude: parish.location?.longitude?.toString() || '',
      mpesaTillNumber: parish.mpesaTillNumber || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingParish(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const parishData: Record<string, unknown> = {
        name: formData.name.trim(),
        diocese: formData.diocese.trim(),
        address: formData.address.trim(),
        location: {
          latitude: parseFloat(formData.latitude) || 0,
          longitude: parseFloat(formData.longitude) || 0,
        },
        updatedAt: Timestamp.now(),
      };
      if (formData.nameSwahili.trim()) parishData.nameSwahili = formData.nameSwahili.trim();
      if (formData.region.trim()) parishData.region = formData.region.trim();
      if (formData.deanery.trim()) parishData.deanery = formData.deanery.trim();
      if (formData.priestName.trim()) parishData.priestName = formData.priestName.trim();
      if (formData.phone.trim()) parishData.phone = formData.phone.trim();
      if (formData.email.trim()) parishData.email = formData.email.trim();
      if (formData.mpesaTillNumber.trim()) parishData.mpesaTillNumber = formData.mpesaTillNumber.trim();

      if (editingParish) {
        await updateDoc(doc(db, 'parishes', editingParish.id), parishData);
      } else {
        await addDoc(collection(db, 'parishes'), {
          ...parishData,
          createdAt: Timestamp.now(),
        });
      }

      closeModal();
      await loadParishes();
    } catch (error) {
      console.error('Error saving parish:', error);
      alert('Imeshindwa kuhifadhi. Tafadhali jaribu tena.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'parishes', deleteTarget.id));
      setDeleteTarget(null);
      await loadParishes();
    } catch (error) {
      console.error('Error deleting parish:', error);
      alert('Imeshindwa kufuta. Tafadhali jaribu tena.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLocationAction = async () => {
    if (!locationTarget || !locationAction) return;
    try {
      setProcessingLocation(true);
      if (locationAction === 'approve') {
        await updateDoc(doc(db, 'parishes', locationTarget.id), {
          locationStatus: 'approved',
          locationRejectionNote: null,
          updatedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(doc(db, 'parishes', locationTarget.id), {
          locationStatus: 'rejected',
          locationRejectionNote: rejectionNote.trim() || 'Eneo halijakubaliwa.',
          updatedAt: Timestamp.now(),
        });
      }
      setLocationTarget(null);
      setLocationAction(null);
      setRejectionNote('');
      await loadParishes();
    } catch (err) {
      console.error(err);
      alert('Imeshindwa. Tafadhali jaribu tena.');
    } finally {
      setProcessingLocation(false);
    }
  };

  const filtered = parishes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.diocese?.toLowerCase().includes(search.toLowerCase()) ||
      p.region?.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass =
    'w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white';

  return (
    <SuperAdminRoute>
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Parokia Zote
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {loading ? '...' : `Parokia ${parishes.length} zimeandikishwa`}
              </p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              Ongeza Parokia
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Tafuta parokia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">
                location_city
              </span>
              <p className="text-gray-500 dark:text-gray-400 mt-3">
                {search ? 'Hakuna parokia inayolingana na utafutaji.' : 'Bado hakuna parokia iliyoandikishwa.'}
              </p>
              {!search && (
                <button
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Ongeza ya Kwanza
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((parish) => (
                <div
                  key={parish.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex flex-col gap-3"
                >
                  {/* Parish image or placeholder */}
                  {parish.imageUrl ? (
                    <img
                      src={parish.imageUrl}
                      alt={parish.name}
                      className="w-full h-36 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-500">
                        church
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug">
                      {parish.name}
                    </h3>
                    {parish.nameSwahili && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{parish.nameSwahili}</p>
                    )}

                    <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base mt-0.5 text-gray-400">domain</span>
                        <span>{parish.diocese}</span>
                      </div>
                      {parish.region && (
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-base mt-0.5 text-gray-400">
                            map
                          </span>
                          <span>{parish.region}</span>
                        </div>
                      )}
                      {parish.priestName && (
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-base mt-0.5 text-gray-400">
                            person
                          </span>
                          <span>{parish.priestName}</span>
                        </div>
                      )}
                    </div>

                    {/* Location status badge */}
                    {parish.locationStatus && (
                      <div className="mt-3 flex items-center gap-2">
                        {parish.locationStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            Eneo Linasubiri Idhini
                          </span>
                        )}
                        {parish.locationStatus === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Eneo Limeidhinishwa
                          </span>
                        )}
                        {parish.locationStatus === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <span className="material-symbols-outlined text-[12px]">cancel</span>
                            Eneo Limekataliwa
                          </span>
                        )}
                      </div>
                    )}

                    {/* Parish ID chip */}
                    <div className="mt-3">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-mono rounded">
                        {parish.id}
                      </span>
                    </div>
                  </div>

                  {/* Location approval actions */}
                  {parish.locationStatus === 'pending' && parish.location && (
                    <div className="mx-0 px-0 pt-2 pb-1">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-2">
                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">Eneo jipya lililotumwa:</p>
                        <a
                          href={`https://www.google.com/maps?q=${parish.location.latitude},${parish.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          {parish.location.latitude.toFixed(5)}, {parish.location.longitude.toFixed(5)}
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setLocationTarget(parish); setLocationAction('approve'); }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Idhinisha
                        </button>
                        <button
                          onClick={() => { setLocationTarget(parish); setLocationAction('reject'); }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">cancel</span>
                          Kataa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => openEdit(parish)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Hariri
                    </button>
                    <button
                      onClick={() => setDeleteTarget(parish)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Futa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingParish ? 'Hariri Parokia' : 'Ongeza Parokia Mpya'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Basic */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Jina (Kiingereza) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      placeholder="St. Peter Parish"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Jina (Kiswahili)
                    </label>
                    <input
                      type="text"
                      value={formData.nameSwahili}
                      onChange={(e) => setFormData({ ...formData, nameSwahili: e.target.value })}
                      className={inputClass}
                      placeholder="Parokia ya Mt. Petro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Jimbo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.diocese}
                      onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                      className={inputClass}
                      placeholder="Jimbo Kuu la Dar es Salaam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mkoa
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className={inputClass}
                      placeholder="Dar es Salaam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dekanati
                    </label>
                    <input
                      type="text"
                      value={formData.deanery}
                      onChange={(e) => setFormData({ ...formData, deanery: e.target.value })}
                      className={inputClass}
                      placeholder="Dekanati ya Masaki"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Padre Paroko
                    </label>
                    <input
                      type="text"
                      value={formData.priestName}
                      onChange={(e) => setFormData({ ...formData, priestName: e.target.value })}
                      className={inputClass}
                      placeholder="Padre Petro Makundi"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Anwani <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className={inputClass + ' resize-none'}
                      placeholder="Masaki, Dar es Salaam, Tanzania"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Namba ya Simu
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+255 XXX XXX XXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Barua Pepe
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass}
                      placeholder="info@parokia.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Namba ya Till ya M-Pesa
                    </label>
                    <input
                      type="text"
                      value={formData.mpesaTillNumber}
                      onChange={(e) => setFormData({ ...formData, mpesaTillNumber: e.target.value })}
                      className={inputClass}
                      placeholder="545454"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Mahali (Latitude &amp; Longitude) <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        className={inputClass}
                        placeholder="-6.7617"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        className={inputClass}
                        placeholder="39.2634"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Inahifadhi...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">save</span>
                        {editingParish ? 'Hifadhi Mabadiliko' : 'Ongeza Parokia'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Location Approve / Reject Modal */}
        {locationTarget && locationAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className={`flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4 ${
                locationAction === 'approve' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <span className={`material-symbols-outlined text-3xl ${
                  locationAction === 'approve' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {locationAction === 'approve' ? 'verified' : 'cancel'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
                {locationAction === 'approve' ? 'Idhinisha Eneo?' : 'Kataa Eneo?'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-4">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{locationTarget.name}</span>
              </p>
              {locationAction === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sababu ya kukataa (hiari)
                  </label>
                  <input
                    type="text"
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Mf: Eneo halikuwa sahihi, jaribu tena."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setLocationTarget(null); setLocationAction(null); setRejectionNote(''); }}
                  disabled={processingLocation}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Ghairi
                </button>
                <button
                  onClick={handleLocationAction}
                  disabled={processingLocation}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    locationAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processingLocation
                    ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    : locationAction === 'approve' ? 'Ndio, Idhinisha' : 'Ndio, Kataa'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-center w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">
                  delete_forever
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
                Futa Parokia?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                Una uhakika unataka kufuta{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {deleteTarget.name}
                </span>
                ? Hatua hii haiwezi kutenduliwa.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Ghairi
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">
                        progress_activity
                      </span>
                      Inafuta...
                    </>
                  ) : (
                    'Ndio, Futa'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </SuperAdminRoute>
  );
}
