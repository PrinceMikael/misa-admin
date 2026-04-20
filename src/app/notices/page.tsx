'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Notice } from '@/types';

const CATEGORIES = [
  { value: 'announcement', label: 'Tangazo' },
  { value: 'event', label: 'Tukio' },
  { value: 'message', label: 'Ujumbe' },
  { value: 'schedule_change', label: 'Mabadiliko ya Ratiba' },
];

const CATEGORY_LABELS: Record<string, string> = {
  announcement: 'Tangazo',
  event: 'Tukio',
  message: 'Ujumbe',
  schedule_change: 'Mabadiliko ya Ratiba',
};

export default function NoticesPage() {
  const { userData } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'announcement' as Notice['category'],
    imageUrl: '',
  });

  useEffect(() => {
    if (!userData) return;
    if (userData.parishId) loadNotices();
    else setLoading(false);
  }, [userData]);

  const loadNotices = async () => {
    if (!userData?.parishId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'notices'),
        where('parishId', '==', userData.parishId),
        orderBy('postedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setNotices(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        postedAt: d.data().postedAt?.toDate() || new Date(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Notice[]);
    } catch (error) {
      console.error('Error loading notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', body: '', category: 'announcement', imageUrl: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.parishId) return;
    try {
      setUploading(true);
      const storageRef = ref(storage, `notices/${userData.parishId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, imageUrl: downloadURL }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Imeshindwa kupakia picha. Tafadhali jaribu tena.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setFormData({
      title: notice.title,
      body: notice.body,
      category: notice.category || 'announcement',
      imageUrl: notice.imageUrl || '',
    });
    setEditingId(notice.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta tangazo hili?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
      loadNotices();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Imeshindwa kufuta');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.parishId) return;
    try {
      setSaving(true);
      const data: Record<string, unknown> = {
        parishId: userData.parishId,
        title: formData.title,
        body: formData.body,
        category: formData.category,
        postedAt: Timestamp.now(),
      };
      if (formData.imageUrl.trim()) data.imageUrl = formData.imageUrl.trim();

      if (editingId) {
        await updateDoc(doc(db, 'notices', editingId), data);
      } else {
        await addDoc(collection(db, 'notices'), { ...data, createdAt: Timestamp.now() });
      }
      resetForm();
      loadNotices();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Imeshindwa kuhifadhi');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Matangazo</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Simamia matangazo na taarifa za parokia yako</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors">
            <span className="material-symbols-outlined">add</span>
            <span>Ongeza Tangazo</span>
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingId ? 'Hariri Tangazo' : 'Ongeza Tangazo Jipya'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kichwa cha Habari <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className={inputClass}
                    placeholder="Andika kichwa cha tangazo..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maudhui <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.body}
                    onChange={e => setFormData({ ...formData, body: e.target.value })}
                    rows={5}
                    className={inputClass + " resize-none"}
                    placeholder="Andika maudhui ya tangazo..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aina</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as Notice['category'] })}
                    className={inputClass}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Picha (hiari)
                  </label>
                  {formData.imageUrl && (
                    <div className="relative mb-2 inline-block">
                      <img
                        src={formData.imageUrl}
                        alt="Hakiki"
                        className="h-32 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}
                  <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed cursor-pointer transition-colors ${
                    uploading
                      ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5'
                  }`}>
                    <span className="material-symbols-outlined text-gray-400">upload</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {uploading ? 'Inapakia picha...' : formData.imageUrl ? 'Badilisha picha' : 'Chagua picha'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={resetForm} className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        Inahifadhi...
                      </>
                    ) : (
                      editingId ? 'Sasisha' : 'Chapisha'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Notices List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">campaign</span>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Hakuna matangazo bado</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors">
              <span className="material-symbols-outlined">add</span>
              <span>Ongeza Tangazo la Kwanza</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map(notice => (
              <div key={notice.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  {notice.imageUrl && (
                    <img
                      src={notice.imageUrl}
                      alt={notice.title}
                      className="w-20 h-20 rounded-lg object-cover shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{notice.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {CATEGORY_LABELS[notice.category ?? ''] ?? 'Tangazo'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {notice.postedAt.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEdit(notice)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button onClick={() => handleDelete(notice.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">{notice.body}</p>
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
