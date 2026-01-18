'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Lock, Unlock } from 'lucide-react';

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  disabled: boolean;
  createdAt: Date;
}

interface UsersTableProps {
  users: User[];
}

type FilterTab = 'all' | 'active' | 'disabled';

export function UsersTable({ users }: UsersTableProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    if (filter === 'active') return !user.disabled;
    if (filter === 'disabled') return user.disabled;
    return true;
  });

  const handleResetPassword = async (userId: string, username: string) => {
    setIsLoading(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to reset password');
        return;
      }

      alert(`Password reset link sent to ${username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(null);
    }
  };

  const handleToggleDisable = async (userId: string, currentDisabled: boolean) => {
    setIsLoading(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !currentDisabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update user');
        return;
      }

      // Trigger page reload to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div>
      {error && (
        <div
          className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {(['all', 'active', 'disabled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-current={filter === tab ? 'page' : undefined}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({filteredUsers.length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Username</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Role</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Created</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900" scope="col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 text-slate-900 font-medium">
                  {user.username || '—'}
                </td>
                <td className="px-6 py-4 text-slate-600">{user.email || '—'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      user.disabled
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                    aria-label={user.disabled ? 'User disabled' : 'User active'}
                  >
                    {user.disabled ? 'Disabled' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(user.id, user.username || user.email || user.id)}
                      disabled={isLoading === user.id}
                      aria-label={`Reset password for ${user.username || user.email}`}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant={user.disabled ? 'default' : 'outline'}
                      onClick={() => handleToggleDisable(user.id, user.disabled)}
                      disabled={isLoading === user.id}
                      aria-label={
                        user.disabled ? `Enable user ${user.username}` : `Disable user ${user.username}`
                      }
                      className="text-xs"
                    >
                      {user.disabled ? (
                        <>
                          <Unlock className="w-3 h-3 mr-1" />
                          Enable
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Disable
                        </>
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600">No users found</p>
        </div>
      )}
    </div>
  );
}
