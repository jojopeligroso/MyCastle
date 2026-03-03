'use client';

/**
 * VerificationCodeInput Component
 * 6-digit code input for contact verification
 */

import React, { useState, useRef, useEffect } from 'react';

interface VerificationCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function VerificationCodeInput({
  length = 6,
  onComplete,
  disabled = false,
  error,
  autoFocus = true,
}: VerificationCodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    // Move to next input if digit entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    const code = newValues.join('');
    if (code.length === length && !code.includes('')) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    if (pastedData) {
      const newValues = Array(length).fill('');
      pastedData.split('').forEach((char, i) => {
        newValues[i] = char;
      });
      setValues(newValues);

      // Focus the next empty input or last input
      const nextEmptyIndex = newValues.findIndex(v => !v);
      const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();

      // Check if complete
      if (pastedData.length === length) {
        onComplete(pastedData);
      }
    }
  };

  const reset = () => {
    setValues(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2">
        {values.map((value, index) => (
          <input
            key={index}
            ref={el => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={reset}
        disabled={disabled}
        className="block mx-auto text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
      >
        Clear
      </button>
    </div>
  );
}

export default VerificationCodeInput;
