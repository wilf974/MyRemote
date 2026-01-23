'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api/client';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuthStore();

  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    refreshUser().then(() => {
      if (!isAuthenticated) {
        router.push('/login');
      }
    });
  }, [isAuthenticated, refreshUser, router]);

  const handleGenerate2FA = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/2fa/generate');
      setSecret(response.data.secret);
      setQrCode(response.data.qrCode);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate 2FA secret');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/2fa/enable', {
        secret,
        totpCode,
      });

      setSuccess('2FA enabled successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const password = prompt('Enter your password to disable 2FA:');
    if (!password) return;

    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/2fa/disable', { password });
      setSuccess('2FA disabled successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
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
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-primary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Two-Factor Authentication</h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {user.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <p className="text-green-800">✓ Two-factor authentication is currently enabled</p>
                </div>

                <button
                  onClick={handleDisable2FA}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Disable 2FA'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>

                {!secret ? (
                  <button
                    onClick={handleGenerate2FA}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                  >
                    {isLoading ? 'Generating...' : 'Generate 2FA Secret'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">1. Scan this QR code with your authenticator app</h3>
                      <p className="text-sm text-gray-600 mb-2">Use Google Authenticator, Authy, or any TOTP app</p>
                      <div className="bg-gray-100 p-4 border rounded text-center">
                        <code className="text-xs break-all">{qrCode}</code>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">2. Or enter this secret manually</h3>
                      <code className="bg-gray-100 px-3 py-2 rounded block">{secret}</code>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">3. Enter the 6-digit code from your app</h3>
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <button
                      onClick={handleEnable2FA}
                      disabled={isLoading || totpCode.length !== 6}
                      className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                    >
                      {isLoading ? 'Enabling...' : 'Enable 2FA'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
