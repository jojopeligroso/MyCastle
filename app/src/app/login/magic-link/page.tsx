/**
 * Magic Link Login Page
 *
 * Email-only authentication flow using magic links.
 * Provides a passwordless login option alongside traditional password auth.
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function MagicLinkLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show any error from URL params (e.g., from auth callback)
  const urlError = searchParams.get('error');

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setError(
          `Too many requests. Please try again in ${data.retryAfter || 60} seconds.`
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.');
        setLoading(false);
        return;
      }

      // Success! Show message
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Magic link request error:', err);
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-600 mb-6">
              If an account exists with <strong>{email}</strong>, we&apos;ve sent you a magic link.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Click the link in your email within 1 hour to sign in.
                The link can only be used once.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Didn&apos;t receive an email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Send another link
            </button>
          </div>
          <div className="text-center pt-4 border-t">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to password login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            MyCastle
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with a magic link
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            No password required
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleMagicLinkRequest}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-gray-500">
              We&apos;ll send you a magic link to sign in instantly
            </p>
          </div>

          {(error || urlError) && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error || urlError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending magic link...
              </span>
            ) : (
              'Send magic link'
            )}
          </button>
        </form>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with password
          </Link>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            How magic links work
          </h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Enter your registered email address</li>
            <li>• Receive an instant login link via email</li>
            <li>• Click the link to sign in securely</li>
            <li>• No password needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
