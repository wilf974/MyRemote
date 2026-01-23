'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser, logout } = useAuthStore();

  useEffect(() => {
    // Check authentication on mount
    refreshUser().then(() => {
      if (!isAuthenticated) {
        router.push('/login');
      }
    });
  }, [isAuthenticated, refreshUser, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">MyRemote</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome to MyRemote</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">2FA Status</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.twoFactorEnabled ? (
                        <span className="text-green-600">✓ Enabled</span>
                      ) : (
                        <span className="text-yellow-600">⚠ Disabled</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <button
                    onClick={() => router.push('/dashboard/agents')}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                  >
                    Manage Agents
                  </button>
                  {(user.role === 'ADMIN' || user.role === 'TECHNICIAN') && (
                    <button
                      onClick={() => router.push('/dashboard/users')}
                      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    >
                      Manage Users
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/dashboard/2fa')}
                    className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary-dark"
                  >
                    2FA Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
