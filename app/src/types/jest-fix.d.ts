/**
 * Jest type fixes for @jest/globals
 *
 * When using strict TypeScript with @jest/globals, the mock function
 * types can be overly restrictive. This file provides utilities to
 * work around these issues.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Re-export a permissive mock function type
export type AnyMockFn = jest.Mock<any>;

// Helper to create typed mock objects without strict checking
export function mockDb() {
  return {
    select: jest.fn() as any,
    insert: jest.fn() as any,
    update: jest.fn() as any,
    delete: jest.fn() as any,
    transaction: jest.fn() as any,
  };
}

// Helper for mock chain builders
export function mockChain(resolvedValue: any = []) {
  return {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    then: jest.fn().mockResolvedValue(resolvedValue),
  };
}
