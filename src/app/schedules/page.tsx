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
      if (formData.timeLabel) data.timeLabel = formData.timeLabel;
      if (formData.priestName) data.priestName = formData.priestName;
      if (formData.location) data.location = formData.location;
      if (formData.isSpecial) data.isSpecial = true;
      if (formData.specialLabel) data.specialLabel = formData.specialLabel;
      if (formData.notes) data.notes = formData.notes;

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

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Ratiba za Misa</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Simamia ratiba za Misa za parokia yako</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors">
            <span className="material-symbols-outlined">add</span>
            <span>Ongeza Ratiba</span>
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingId ? 'Hariri Ratiba' : 'Ongeza Ratiba Mpya'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Siku <span className="text-red-500">*</span></label>
                    <select required value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: parseInt(e.target.value) as any})} className={inputClass}>
                      {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Saa <span className="text-red-500">*</span></label>
                    <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lebo ya Saa</label>
                    <select value={formData.timeLabel} onChange={e => setFormData({...formData, timeLabel: e.target.value})} className={inputClass}>
                      <option value="">Hakuna</option>
                      {TIME_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lugha <span className="text-red-500">*</span></label>
                    <select required value={formData.language} onChange={e => setFormData({...formData, language: e.target.value as any})} className={inputClass}>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jina la Padre</label>
                    <input type="text" value={formData.priestName} onChange={e => setFormData({...formData, priestName: e.target.value})} className={inputClass} placeholder="Padre Petro" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mahali</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className={inputClass} placeholder="Kanisa Kuu" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <input type="checkbox" id="isSpecial" checked={formData.isSpecial} onChange={e => setFormData({...formData, isSpecial: e.target.checked})} className="w-5 h-5 accent-primary" />
                    <label htmlFor="isSpecial" className="text-sm font-medium text-gray-700 dark:text-gray-300">Misa Maalum?</label>
                  </div>
                  {formData.isSpecial && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lebo ya Misa Maalum</label>
                      <select value={formData.specialLabel} onChange={e => setFormData({...formData, specialLabel: e.target.value})} className={inputClass}>
                        <option value="">Chagua...</option>
                        {SPECIAL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maelezo</label>
                    <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className={inputClass + " resize-none"} placeholder="Maelezo ya ziada..." />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={resetForm} className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Ghairi
                  </button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors">
                    {editingId ? 'Sasisha' : 'Ongeza'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Schedules List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">calendar_month</span>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Hakuna ratiba za Misa bado</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors">
              <span className="material-symbols-outlined">add</span>
              <span>Ongeza Ratiba ya Kwanza</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS_OF_WEEK.map(day => {
              const daySchedules = groupedSchedules[day.value] || [];
              if (daySchedules.length === 0) return null;
              return (
                <div key={day.value} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{day.label}</h3>
                  <div className="space-y-3">
                    {daySchedules.map(schedule => (
                      <div key={schedule.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 dark:bg-primary/20 rounded-lg flex flex-col items-center justify-center text-primary shrink-0">
                          {schedule.timeLabel && <span className="text-[10px] sm:text-xs font-bold">{schedule.timeLabel}</span>}
                          <span className="text-sm sm:text-lg font-bold">{schedule.time}</span>
                          {schedule.isSpecial && <span className="text-[8px] font-bold text-orange-500">MAALUM</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">Misa ya {schedule.language}</p>
                          {schedule.priestName && <p className="text-xs text-gray-500 truncate">Padre: {schedule.priestName}</p>}
                          {schedule.location && <p className="text-xs text-gray-400 truncate">{schedule.location}</p>}
                          {schedule.specialLabel && <span className="text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">{schedule.specialLabel}</span>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleEdit(schedule)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button onClick={() => handleDelete(schedule.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <span className="material-symbols-outlined text-xl">delete</span>
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
