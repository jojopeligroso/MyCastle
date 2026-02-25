# Import Performance Optimization

**Status:** Implemented
**Date:** 2026-02-25
**Expected Improvement:** 86% (100s -> ~14s for 252 students)

## Summary

This document describes the performance optimizations applied to the student import system.

## Problem Statement

Importing 252 students was taking ~100 seconds (0.4s per student). Target: <20 seconds.

## Root Causes Identified

### Critical (P0)

1. **N+1 queries in matcher** (`matcher.ts:332-395`)
   - Sequential `await` in loop instead of `Promise.all()`
   - 252 individual DB round-trips for candidate matching

2. **Sequential inserts** (`batches/route.ts:160-184`)
   - 252 individual INSERT statements instead of batch
   - O(n^2) `Array.find()` lookup in loop

### Major (P1)

3. **Sequential apply operations** (`apply-service.ts:210-333`)
   - Individual class lookups, user/student/enrollment inserts
   - ~1000 queries for 252 students

## Optimizations Implemented

### 1. Matcher Optimization (`matcher.ts`)

- **Pre-fetch enrollments:** Single query to fetch all active enrollments for tenant
- **In-memory matching:** Filter and score candidates without DB queries
- **Parallel diff calculations:** Process all diffs concurrently with `Promise.all()`
- **Pre-computed lowercase names:** Faster string matching

### 2. Apply Service Optimization (`apply-service.ts`)

- **Pre-fetch classes:** Single query to build class name -> ID lookup map
- **Batch insert users:** Single multi-row INSERT for all users
- **Batch insert students:** Single multi-row INSERT for all students
- **Batch insert enrollments:** Single multi-row INSERT for all enrollments
- **Reduced transaction round-trips:** From ~1000 to ~10 queries

### 3. Database Indexes (`FRESH_0022_performance_indexes.sql`)

- `pg_trgm` extension for fuzzy text matching
- Trigram index on `users.name` for ILIKE queries
- Compound index on `enrollments(tenant_id, status)`
- Index on `classes(tenant_id, LOWER(name))`

## Expected Performance

| Phase     | Before   | After    | Improvement |
| --------- | -------- | -------- | ----------- |
| Parsing   | 5s       | 5s       | -           |
| Matching  | 80s      | 5s       | 94%         |
| Staging   | 5s       | 1s       | 80%         |
| Apply     | 10s      | 3s       | 70%         |
| **Total** | **100s** | **~14s** | **86%**     |

## Timing Instrumentation

The optimized code includes `console.time()` markers for performance measurement:

- `prefetchAllEnrollments` - Time to fetch all enrollments
- `inMemoryMatching` - Time for in-memory candidate matching
- `diffCalculations` - Time for parallel diff calculations
- `processRowsForMatching` - Total matching time
- `fetchChanges` - Time to fetch proposed changes
- `fetchStagingRows` - Time to fetch staging rows
- `prefetchClasses` - Time to fetch all classes
- `prepareInsertData` - Time to prepare batch insert data
- `batchInsertUsers` - Time to batch insert users
- `batchInsertStudents` - Time to batch insert students
- `batchInsertEnrollments` - Time to batch insert enrollments
- `processUpdates` - Time to process updates
- `applyBatchChanges` - Total apply time

## Migration Required

Run `FRESH_0022_performance_indexes.sql` in Supabase SQL Editor to create the performance indexes.

## Files Modified

- `app/src/lib/imports/matcher.ts` - Optimized matcher with pre-fetch and parallel processing
- `app/src/lib/imports/apply-service.ts` - Optimized apply service with batch inserts
- `app/migrations/FRESH_0022_performance_indexes.sql` - Performance indexes migration
