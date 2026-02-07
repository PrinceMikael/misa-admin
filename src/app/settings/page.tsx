'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { userData } = useAuth();

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white font-medium">{userData?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="text-gray-900 dark:text-white font-medium">{userData?.role}</p>
              </div>
              {userData?.parishId && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Parish ID</p>
                  <p className="text-gray-900 dark:text-white font-medium font-mono text-sm">
                    {userData.parishId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Help */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Help & Support</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Need help? Contact your diocese administrator or email support.
            </p>
            <a
              href="mailto:support@misa.app"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">email</span>
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
