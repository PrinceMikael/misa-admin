'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { MassSchedule } from '@/types';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Jumapili (Sunday)' },
  { value: 1, label: 'Jumatatu (Monday)' },
  { value: 2, label: 'Jumanne (Tuesday)' },
  { value: 3, label: 'Jumatano (Wednesday)' },
  { value: 4, label: 'Alhamisi (Thursday)' },
  { value: 5, label: 'Ijumaa (Friday)' },
  { value: 6, label: 'Jumamosi (Saturday)' },
];

const TIME_LABELS = ['ASUBUHI', 'MCHANA', 'JIONI'];
const LANGUAGES = ['Swahili', 'English', 'Latin', 'Other'];

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
    language: 'Swahili' as 'Swahili' | 'English' | 'Latin' | 'Other',
    priestName: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (userData?.parishId) {
      loadSchedules();
    }
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

      const querySnapshot = await getDocs(q);
      const schedData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as MassSchedule[];

      setSchedules(schedData);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      dayOfWeek: 0,
      time: '',
      timeLabel: '',
      language: 'Swahili',
      priestName: '',
      location: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (schedule: MassSchedule) => {
    setFormData({
      dayOfWeek: schedule.dayOfWeek,
      time: schedule.time,
      timeLabel: schedule.timeLabel || '',
      language: schedule.language,
      priestName: schedule.priestName || '',
      location: schedule.location || '',
      notes: schedule.notes || '',
    });
    setEditingId(schedule.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await deleteDoc(doc(db, 'mass_schedules', id));
      loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.parishId) return;

    try {
      const scheduleData = {
        parishId: userData.parishId,
        dayOfWeek: formData.dayOfWeek,
        time: formData.time,
        timeLabel: formData.timeLabel || undefined,
        language: formData.language,
        priestName: formData.priestName || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        isActive: true,
        updatedAt: Timestamp.now(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'mass_schedules', editingId), scheduleData);
      } else {
        await addDoc(collection(db, 'mass_schedules'), {
          ...scheduleData,
          createdAt: Timestamp.now(),
        });
      }

      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    }
  };

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = [];
    }
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {} as Record<number, MassSchedule[]>);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Mass Schedules</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your parish's Mass schedules
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Add Schedule</span>
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingId ? 'Edit Schedule' : 'Add New Schedule'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Day of Week <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6 })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Label
                    </label>
                    <select
                      value={formData.timeLabel}
                      onChange={(e) => setFormData({ ...formData, timeLabel: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
                      {TIME_LABELS.map(label => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priest Name
                    </label>
                    <input
                      type="text"
                      value={formData.priestName}
                      onChange={(e) => setFormData({ ...formData, priestName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                      placeholder="Padre Petro"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                      placeholder="Kanisa Kuu (Central)"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white resize-none"
                      placeholder="Additional information..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
                  >
                    {editingId ? 'Update Schedule' : 'Add Schedule'}
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
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4 block">
              calendar_month
            </span>
            <p className="text-gray-600 dark:text-gray-400 mb-4">No Mass schedules yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              <span>Add Your First Schedule</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS_OF_WEEK.map(day => {
              const daySchedules = groupedSchedules[day.value] || [];
              if (daySchedules.length === 0) return null;

              return (
                <div key={day.value} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{day.label}</h3>
                  <div className="space-y-3">
                    {daySchedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-lg flex flex-col items-center justify-center text-primary flex-shrink-0">
                          {schedule.timeLabel && (
                            <span className="text-xs font-bold">{schedule.timeLabel}</span>
                          )}
                          <span className="text-lg font-bold">{schedule.time}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {schedule.language} Mass
                          </p>
                          {schedule.location && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{schedule.location}</p>
                          )}
                          {schedule.priestName && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">Padre: {schedule.priestName}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <span className="material-symbols-outlined">delete</span>
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
