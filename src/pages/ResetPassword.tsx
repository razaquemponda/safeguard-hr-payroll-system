// src/pages/ResetPassword.tsx

import { useState } from 'react';
import { requestPasswordReset, updatePassword } from '../utils/passwordReset';
import { Card, Button } from '../components/ui';
import { showNotification } from '../utils/clickHandlers';

export const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const isResetPage = window.location.pathname.includes('/reset-password');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await requestPasswordReset(email);
    if (result.success) {
      setSuccess(true);
      showNotification(result.message, 'success');
    } else {
      setError(result.message);
      showNotification(result.message, 'error');
    }
    setLoading(false);
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await updatePassword(newPassword, confirmPassword);
    if (result.success) {
      setSuccess(true);
      showNotification(result.message, 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else {
      setError(result.message);
      showNotification(result.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#081C3A]">
            {isResetPage ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            {isResetPage 
              ? 'Enter your new password below'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {isResetPage 
              ? 'Password updated successfully! Redirecting to login...'
              : 'Password reset link sent! Check your email.'}
          </div>
        )}

        {isResetPage ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
                placeholder="Enter new password"
                required
                minLength={8}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
                placeholder="Confirm new password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={loading || success}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
                placeholder="Enter your email"
                required
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={loading || success}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-[#081C3A] hover:underline">
            Back to Login
          </a>
        </div>
      </Card>
    </div>
  );
};