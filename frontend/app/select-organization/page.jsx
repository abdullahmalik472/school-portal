
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectOrganizationPage() {
  const router = useRouter();

  const [role, setRole] = useState('student');
  const [organization, setOrganization] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const response = await fetch('/api/organizations');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load organizations');
        }

        setOrganizations(data.organizations || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  function handleContinue(e) {
    e.preventDefault();
    setError('');

    if (role === 'admin') {
      if (!adminCode.trim()) {
        setError('Please enter your Admin Access Code.');
        return;
      }

      sessionStorage.setItem('registrationRole', 'admin');
      sessionStorage.setItem('adminAccessCode', adminCode.trim());

      router.push('/register');
      return;
    }

    if (!organization) {
      setError('Please select your organization.');
      return;
    }

    sessionStorage.setItem('registrationRole', role);
    sessionStorage.setItem('organizationId', organization);

    router.push('/register');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-8 shadow-2xl sm:p-10">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🏫
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            School Portal
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Select your role and organization to continue
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-6">

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Select Your Role
            </label>

            <div className="grid grid-cols-3 gap-3">
              {['student', 'teacher', 'admin'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setRole(item);
                    setError('');
                  }}
                  className={`rounded-xl border-2 px-3 py-4 text-sm font-semibold capitalize transition ${
                    role === item
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {item === 'student' && '🎓 '}
                  {item === 'teacher' && '👨‍🏫 '}
                  {item === 'admin' && '🛡️ '}
                  {item}
                </button>
              ))}
            </div>
          </div>

          {role !== 'admin' ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Select Organization
              </label>

              <select
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {loading ? 'Loading organizations...' : 'Choose your organization'}
                </option>

                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.organization_code})
                  </option>
                ))}
              </select>

              {!loading && organizations.length === 0 && (
                <p className="mt-2 text-xs text-orange-600">
                  No organizations available.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Admin Access Code
              </label>

              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter your admin access code"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                Authorized platform administrators only.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading && role !== 'admin'}
            className="w-full rounded-xl bg-blue-700 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue →
          </button>

        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          School Portal · Multi-Organization Platform
        </p>
      </div>
    </main>
  );
}
