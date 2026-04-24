'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Notice } from '@/types';

const CATEGORIES = [
  { value: 'announcement',   label: 'Tangazo' },
  { value: 'event',          label: 'Tukio' },
  { value: 'message',        label: 'Ujumbe' },
  { value: 'schedule_change',label: 'Mabadiliko ya Ratiba' },
];

const CATEGORY_LABELS: Record<string, string> = {
  announcement:    'Tangazo',
  event:           'Tukio',
  message:         'Ujumbe',
  schedule_change: 'Mabadiliko ya Ratiba',
};

const CATEGORY_ICON: Record<string, string> = {
  announcement:    'campaign',
  event:           'event',
  message:         'mail',
  schedule_change: 'schedule',
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
        postedAt:  d.data().postedAt?.toDate()  || new Date(),
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
      setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 anim-fade-up">
          <div>
            <h1
              className="text-4xl sm:text-5xl font-semibold leading-none text-[#1a3d2e] dark:text-[#e8e3d8]"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Matangazo
            </h1>
            <p className="text-sm text-ash dark:text-[#6b9080] mt-2">
              Simamia matangazo na taarifa za parokia yako
            </p>
            <hr className="gold-rule mt-4 max-w-20" />
          </div>
          <button onClick={() => setShowForm(true)} className="btn-gold shrink-0 mt-1">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Ongeza Tangazo</span>
            <span className="sm:hidden">Ongeza</span>
          </button>
        </div>

        {/* Bottom-sheet modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white dark:bg-[#17291f] w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#e8e3d8] dark:border-[#253d2e]">

              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e8e3d8] dark:border-[#253d2e]">
                <h2
                  className="text-2xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  {editingId ? 'Hariri Tangazo' : 'Tangazo Jipya'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-xl text-ash hover:text-ink dark:hover:text-[#e8e3d8] hover:bg-parchment dark:hover:bg-[#1a2e23] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                    Kichwa cha Habari <span className="text-[#c4933f]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="input-illuminated"
                    placeholder="Andika kichwa cha tangazo…"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                    Maudhui <span className="text-[#c4933f]">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.body}
                    onChange={e => setFormData({ ...formData, body: e.target.value })}
                    rows={5}
                    className="input-illuminated resize-none"
                    placeholder="Andika maudhui ya tangazo…"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                    Aina
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as Notice['category'] })}
                    className="input-illuminated"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Image */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                    Picha (hiari)
                  </label>
                  {formData.imageUrl && (
                    <div className="relative mb-2 inline-block">
                      <img src={formData.imageUrl} alt="Hakiki" className="h-28 rounded-xl object-cover border border-[#e8e3d8] dark:border-[#253d2e]" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-[#ef4444] text-white rounded-full flex items-center justify-center hover:bg-[#dc2626]"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  )}
                  <label className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-colors ${
                    uploading
                      ? 'opacity-50 cursor-not-allowed border-[#e8e3d8] dark:border-[#253d2e]'
                      : 'border-[#d4cfc4] dark:border-[#253d2e] hover:border-[#c4933f] hover:bg-[#c4933f]/5'
                  }`}>
                    <span className="material-symbols-outlined text-[20px] text-ash">upload</span>
                    <span className="text-sm text-ash dark:text-[#6b9080]">
                      {uploading ? 'Inapakia picha…' : formData.imageUrl ? 'Badilisha picha' : 'Chagua picha'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 border border-[#e8e3d8] dark:border-[#253d2e] text-ash dark:text-[#6b9080] text-sm font-semibold rounded-xl hover:border-[#c4933f] transition-colors"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="flex-1 btn-gold justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        Inahifadhi…
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

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4933f] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-ash italic" style={{ fontFamily: 'var(--font-cormorant)' }}>Inapakia…</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-ash-light dark:text-[#2e4a38] mb-3">campaign</span>
            <p className="text-ash italic mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>Hakuna matangazo bado</p>
            <button onClick={() => setShowForm(true)} className="btn-gold">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ongeza Tangazo la Kwanza
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map(notice => (
              <div key={notice.id} className="card p-4 sm:p-5 hover:shadow-md transition-shadow anim-fade-up">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Category icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1a3d2e20, #1a3d2e10)', border: '1px solid #1a3d2e15' }}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#1a3d2e] dark:text-[#9db8a8]">
                      {CATEGORY_ICON[notice.category ?? ''] ?? 'campaign'}
                    </span>
                  </div>

                  {/* Notice image on mobile */}
                  {notice.imageUrl && (
                    <img src={notice.imageUrl} alt={notice.title} className="w-14 h-14 rounded-xl object-cover shrink-0 sm:hidden" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-ink dark:text-[#e8e3d8] truncate" style={{ fontFamily: 'var(--font-cormorant)' }}>
                          {notice.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-semibold bg-parchment-deep dark:bg-[#1a2e23] text-ash dark:text-[#6b9080] px-2 py-0.5 rounded">
                            {CATEGORY_LABELS[notice.category ?? ''] ?? 'Tangazo'}
                          </span>
                          <span className="text-[11px] text-ash dark:text-[#5a8070]">
                            {notice.postedAt.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(notice)}
                          className="p-1.5 rounded-lg text-ash hover:text-[#1a3d2e] dark:hover:text-[#e8e3d8] hover:bg-parchment dark:hover:bg-[#1a2e23] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(notice.id)}
                          className="p-1.5 rounded-lg text-ash hover:text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <p className="text-sm text-ash dark:text-[#6b9080] leading-relaxed line-clamp-3 flex-1">
                        {notice.body}
                      </p>
                      {notice.imageUrl && (
                        <img src={notice.imageUrl} alt={notice.title} className="w-16 h-16 rounded-xl object-cover shrink-0 hidden sm:block" />
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
