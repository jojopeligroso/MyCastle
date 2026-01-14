'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPayment } from './actions';

interface Props {
  bookingId: string;
  balance: string;
}

export function AddPaymentForm({ bookingId, balance }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await addPayment({
        bookingId,
        amount,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber || null,
      });

      if (result.success) {
        setSuccess(true);
        setAmount('');
        setReferenceNumber('');
        router.refresh();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to add payment');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 sticky top-8">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h2>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-3">
          <p className="text-sm text-green-700">Payment recorded successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (EUR) *
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0.01"
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">Balance due: €{balance}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method *
          </label>
          <select
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Cash">Cash</option>
            <option value="PayPal">PayPal</option>
            <option value="Stripe">Stripe</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !amount}
          className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Recording...' : 'Record Payment'}
        </button>
      </form>
    </div>
  );
}
