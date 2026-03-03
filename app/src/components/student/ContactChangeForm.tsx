'use client';

/**
 * ContactChangeForm Component
 * Form for changing email or phone with verification
 */

import React, { useState, useEffect } from 'react';
import { VerificationCodeInput } from './VerificationCodeInput';

type ContactType = 'email' | 'phone';
type Step = 'input' | 'verify';

interface ContactChangeFormProps {
  contactType: ContactType;
  currentValue?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface VerificationState {
  verificationId: string;
  expiresAt: Date;
  maskedValue: string;
}

export function ContactChangeForm({
  contactType,
  currentValue,
  onSuccess,
  onCancel,
}: ContactChangeFormProps) {
  const [step, setStep] = useState<Step>('input');
  const [newValue, setNewValue] = useState('');
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update cooldown timer
  useEffect(() => {
    if (!cooldownUntil) return;

    const updateCooldown = () => {
      const now = new Date();
      if (cooldownUntil <= now) {
        setCooldownUntil(null);
        return;
      }

      const seconds = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
      setTimeRemaining(`${seconds}s`);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Update expiry timer
  useEffect(() => {
    if (!verification?.expiresAt) return;

    const updateExpiry = () => {
      const now = new Date();
      const expiresAt = new Date(verification.expiresAt);

      if (expiresAt <= now) {
        setError('Verification code has expired. Please request a new one.');
        setStep('input');
        setVerification(null);
        return;
      }

      const minutes = Math.ceil((expiresAt.getTime() - now.getTime()) / 60000);
      setTimeRemaining(minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);
    };

    updateExpiry();
    const interval = setInterval(updateExpiry, 30000);
    return () => clearInterval(interval);
  }, [verification?.expiresAt]);

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/student/verify/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactType,
          newValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownUntil) {
          setCooldownUntil(new Date(data.cooldownUntil));
        }
        throw new Error(data.error || 'Failed to request verification');
      }

      setVerification({
        verificationId: data.verificationId,
        expiresAt: new Date(data.expiresAt),
        maskedValue: maskValue(newValue),
      });
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmVerification = async (code: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/student/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactType,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        throw new Error(data.error || 'Failed to verify code');
      }

      // Success!
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setStep('input');
    setVerification(null);
    setAttemptsRemaining(null);
    // The form will auto-submit or user can click send again
  };

  const maskValue = (value: string): string => {
    if (contactType === 'email') {
      const [local, domain] = value.split('@');
      if (!domain) return '***';
      return `${local.charAt(0)}***@${domain}`;
    } else {
      const digits = value.replace(/\D/g, '');
      return `***${digits.slice(-4)}`;
    }
  };

  const getInputType = () => {
    return contactType === 'email' ? 'email' : 'tel';
  };

  const getPlaceholder = () => {
    return contactType === 'email' ? 'Enter new email address' : 'Enter new phone number';
  };

  const getLabel = () => {
    return contactType === 'email' ? 'Email Address' : 'Phone Number';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {step === 'input' ? (
        <form onSubmit={handleRequestVerification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New {getLabel()}
            </label>
            {currentValue && (
              <p className="text-sm text-gray-500 mb-2">
                Current: {maskValue(currentValue)}
              </p>
            )}
            <input
              type={getInputType()}
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder={getPlaceholder()}
              required
              disabled={isLoading || !!cooldownUntil}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !newValue || !!cooldownUntil}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Sending...'
                : cooldownUntil
                  ? `Wait ${timeRemaining}`
                  : 'Send Verification Code'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Enter Verification Code</h3>
            <p className="text-sm text-gray-500 mt-1">
              We sent a 6-digit code to {verification?.maskedValue}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Code expires in {timeRemaining}
            </p>
          </div>

          <VerificationCodeInput
            onComplete={handleConfirmVerification}
            disabled={isLoading}
            error={error || undefined}
          />

          {attemptsRemaining !== null && attemptsRemaining < 5 && (
            <p className="text-sm text-amber-600 text-center">
              {attemptsRemaining} attempts remaining
            </p>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Resend Code
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setVerification(null);
                setError(null);
                setAttemptsRemaining(null);
              }}
              disabled={isLoading}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change {getLabel()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactChangeForm;
