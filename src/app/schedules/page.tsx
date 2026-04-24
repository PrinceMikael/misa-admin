'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { MassSchedule } from '@/types';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Jumapili' },
  { value: 1, label: 'Jumatatu' },
  { value: 2, label: 'Jumanne' },
  { value: 3, label: 'Jumatano' },
  { value: 4, label: 'Alhamisi' },
  { value: 5, label: 'Ijumaa' },
  { value: 6, label: 'Jumamosi' },
];

const TIME_LABELS = ['MAPEMA', 'ASUBUHI', 'MCHANA', 'JIONI'];
const LANGUAGES = ['Swahili', 'English', 'Latin', 'Other'];
const SPECIAL_LABELS = ['Ijumaa ya Kwanza', 'Siku Takatifu', 'Maungamo', 'Novena', 'Ibada ya Msalaba'];

export default function SchedulesPage() {
  const { userData } = useAuth();
  const [schedules, setSchedules] = useState<MassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    dayOfWeek: 0,
    time: '',
    timeLabel: '',
    language: 'Swahili' as MassSchedule['language'],
    priestName: '',
    location: '',
    isSpecial: false,
    specialLabel: '',
    notes: '',
  });

  useEffect(() => {
    if (!userData) return;
    if (userData.parishId) loadSchedules();
    else setLoading(false);
  }, [userData]);

  const loadSchedules = async () => {
    if (!userData?.parishId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'mass_schedules'),
        where('parishId', '==', userData.parishId),
        orderBy('dayOfWeek'),
        orderBy('time')
      );
      const snapshot = await getDocs(q);
      setSchedules(snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MassSchedule[]);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ dayOfWeek: 0, time: '', timeLabel: '', language: 'Swahili', priestName: '', location: '', isSpecial: false, specialLabel: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (s: MassSchedule) => {
    setFormData({
      dayOfWeek: s.dayOfWeek, time: s.time, timeLabel: s.timeLabel || '', language: s.language,
      priestName: s.priestName || '', location: s.location || '',
      isSpecial: s.isSpecial || false, specialLabel: s.specialLabel || '', notes: s.notes || '',
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta ratiba hii?')) return;
    try {
      await deleteDoc(doc(db, 'mass_schedules', id));
      loadSchedules();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Imeshindwa kufuta');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.parishId) return;
    try {
      const data: Record<string, unknown> = {
        parishId: userData.parishId,
        dayOfWeek: formData.dayOfWeek,
        time: formData.time,
        language: formData.language,
        isActive: true,
        updatedAt: Timestamp.now(),
      };
      if (formData.timeLabel)   data.timeLabel   = formData.timeLabel;
      if (formData.priestName)  data.priestName  = formData.priestName;
      if (formData.location)    data.location    = formData.location;
      if (formData.isSpecial)   data.isSpecial   = true;
      if (formData.specialLabel) data.specialLabel = formData.specialLabel;
      if (formData.notes)       data.notes       = formData.notes;

      if (editingId) {
        await updateDoc(doc(db, 'mass_schedules', editingId), data);
      } else {
        await addDoc(collection(db, 'mass_schedules'), { ...data, createdAt: Timestamp.now() });
      }
      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Imeshindwa kuhifadhi');
    }
  };

  const groupedSchedules = schedules.reduce((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {} as Record<number, MassSchedule[]>);

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
              Ratiba za Misa
            </h1>
            <p className="text-sm text-ash dark:text-[#6b9080] mt-2">
              Simamia ratiba za Misa za parokia yako
            </p>
            <hr className="gold-rule mt-4 max-w-20" />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-gold shrink-0 mt-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Ongeza Ratiba</span>
            <span className="sm:hidden">Ongeza</span>
          </button>
        </div>

        {/* Bottom-sheet modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white dark:bg-[#17291f] w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#e8e3d8] dark:border-[#253d2e]">

              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e8e3d8] dark:border-[#253d2e]">
                <h2
                  className="text-2xl font-semibold text-[#1a3d2e] dark:text-[#e8e3d8]"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  {editingId ? 'Hariri Ratiba' : 'Ratiba Mpya'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-xl text-ash hover:text-ink dark:hover:text-[#e8e3d8] hover:bg-parchment dark:hover:bg-[#1a2e23] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Siku <span className="text-[#c4933f]">*</span>
                    </label>
                    <select
                      required
                      value={formData.dayOfWeek}
                      onChange={e => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) as MassSchedule['dayOfWeek'] })}
                      className="input-illuminated"
                    >
                      {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Saa <span className="text-[#c4933f]">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="input-illuminated"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Lebo ya Saa
                    </label>
                    <select
                      value={formData.timeLabel}
                      onChange={e => setFormData({ ...formData, timeLabel: e.target.value })}
                      className="input-illuminated"
                    >
                      <option value="">Hakuna</option>
                      {TIME_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Lugha <span className="text-[#c4933f]">*</span>
                    </label>
                    <select
                      required
                      value={formData.language}
                      onChange={e => setFormData({ ...formData, language: e.target.value as MassSchedule['language'] })}
                      className="input-illuminated"
                    >
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Jina la Padre
                    </label>
                    <input
                      type="text"
                      value={formData.priestName}
                      onChange={e => setFormData({ ...formData, priestName: e.target.value })}
                      className="input-illuminated"
                      placeholder="Padre Petro"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Mahali
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="input-illuminated"
                      placeholder="Kanisa Kuu"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isSpecial"
                      checked={formData.isSpecial}
                      onChange={e => setFormData({ ...formData, isSpecial: e.target.checked })}
                      className="w-4 h-4 accent-[#c4933f]"
                    />
                    <label htmlFor="isSpecial" className="text-sm font-medium text-ink-soft dark:text-[#c0bdb6]">
                      Misa Maalum?
                    </label>
                  </div>

                  {formData.isSpecial && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                        Lebo ya Misa Maalum
                      </label>
                      <select
                        value={formData.specialLabel}
                        onChange={e => setFormData({ ...formData, specialLabel: e.target.value })}
                        className="input-illuminated"
                      >
                        <option value="">Chagua…</option>
                        {SPECIAL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash dark:text-[#5a8070] mb-1.5">
                      Maelezo
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="input-illuminated resize-none"
                      placeholder="Maelezo ya ziada…"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 border border-[#e8e3d8] dark:border-[#253d2e] text-ash dark:text-[#6b9080] text-sm font-semibold rounded-xl hover:border-[#c4933f] transition-colors"
                  >
                    Ghairi
                  </button>
                  <button type="submit" className="flex-1 btn-gold justify-center">
                    {editingId ? 'Sasisha' : 'Ongeza'}
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
        ) : schedules.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-ash-light dark:text-[#2e4a38] mb-3">calendar_month</span>
            <p className="text-ash italic mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Hakuna ratiba za Misa bado
            </p>
            <button onClick={() => setShowForm(true)} className="btn-gold">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ongeza Ratiba ya Kwanza
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => {
              const daySchedules = groupedSchedules[day.value] || [];
              if (daySchedules.length === 0) return null;
              return (
                <div key={day.value} className="card overflow-hidden">
                  {/* Day header */}
                  <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #1a3d2e, #254d3a)' }}>
                    <span className="material-symbols-outlined text-[#c4933f] text-[18px]">calendar_today</span>
                    <h3
                      className="text-base font-semibold text-white"
                      style={{ fontFamily: 'var(--font-cormorant)' }}
                    >
                      {day.label}
                    </h3>
                    <span className="ml-auto text-[11px] text-[#9db8a8] font-medium">
                      {daySchedules.length} Misa{daySchedules.length > 1 ? '' : ''}
                    </span>
                  </div>

                  <div className="divide-y divide-[#e8e3d8] dark:divide-[#253d2e]">
                    {daySchedules.map(schedule => (
                      <div key={schedule.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-parchment/50 dark:hover:bg-[#1a2e23]/50 transition-colors">
                        {/* Time block */}
                        <div
                          className="w-14 shrink-0 text-center"
                          style={{ fontFamily: 'var(--font-cormorant)' }}
                        >
                          {schedule.timeLabel && (
                            <p className="text-[9px] font-bold uppercase tracking-wider text-ash mb-0.5">{schedule.timeLabel}</p>
                          )}
                          <p className="text-xl font-semibold text-[#c4933f] leading-none">{schedule.time}</p>
                          {schedule.isSpecial && (
                            <p className="text-[8px] font-bold text-[#f97316] uppercase tracking-wide mt-0.5">Maalum</p>
                          )}
                        </div>

                        <div className="w-px h-8 bg-[#e8e3d8] dark:bg-[#253d2e] shrink-0" />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink dark:text-[#e8e3d8] truncate">
                            Misa ya {schedule.language}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {schedule.priestName && (
                              <span className="text-[11px] text-ash truncate">Padre: {schedule.priestName}</span>
                            )}
                            {schedule.location && (
                              <span className="text-[11px] text-ash truncate">{schedule.location}</span>
                            )}
                            {schedule.specialLabel && (
                              <span className="text-[10px] font-semibold bg-[#fff7ed] dark:bg-[#2e1a0e] text-[#f97316] px-1.5 py-0.5 rounded">
                                {schedule.specialLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-2 rounded-lg text-ash hover:text-[#1a3d2e] dark:hover:text-[#e8e3d8] hover:bg-parchment dark:hover:bg-[#1a2e23] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-2 rounded-lg text-ash hover:text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
