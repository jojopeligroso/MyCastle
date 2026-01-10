'use client';

import React, { createContext, useContext, useState } from 'react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      onClick={() => context.setOpen(!context.open)}
    >
      {children}
      <span className="ml-2">▼</span>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  return <span>{context.value || placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');

  if (!context.open) return null;

  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  return (
    <button
      type="button"
      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
