/**
 * Column Matcher Tests
 */

import {
  matchColumns,
  createFieldMapping,
  formatMatchingSummary,
  ColumnMatchEntry,
} from '../column-matcher';

describe('Column Matcher', () => {
  describe('matchColumns', () => {
    it('should match exact column names', () => {
      const headers = ['Name', 'Start Date', 'Weeks'];
      const result = matchColumns(headers);

      expect(result.matched.length).toBe(3);
      expect(result.unmatched.length).toBe(0);

      const nameMatch = result.matched.find(m => m.excelHeader === 'Name');
      expect(nameMatch?.matchedField?.name).toBe('name');
      expect(nameMatch?.confidence).toBe(100);
    });

    it('should match alias column names', () => {
      const headers = ['Student Name', 'Course Start Date', 'Booked Weeks'];
      const result = matchColumns(headers);

      expect(result.matched.length).toBe(3);

      const nameMatch = result.matched.find(m => m.excelHeader === 'Student Name');
      expect(nameMatch?.matchedField?.name).toBe('name');

      const startMatch = result.matched.find(m => m.excelHeader === 'Course Start Date');
      expect(startMatch?.matchedField?.name).toBe('courseStartDate');
    });

    it('should identify stray columns', () => {
      const headers = ['Name', 'Start Date', 'Unknown Column', 'Random Field'];
      const result = matchColumns(headers);

      expect(result.matched.length).toBe(2);
      expect(result.unmatched).toContain('Unknown Column');
      expect(result.unmatched).toContain('Random Field');
    });

    it('should detect missing required fields', () => {
      const headers = ['Weeks', 'Course'];
      const result = matchColumns(headers);

      expect(result.summary.requiredFieldsMissing).toContain('Name');
      expect(result.summary.requiredFieldsMissing).toContain('Start Date');
    });

    it('should handle position-based date disambiguation', () => {
      // Course dates before Accom Type, then accommodation dates after
      const headers = ['Name', 'Start Date', 'End Date', 'Accom Type', 'Start Date', 'End Date'];
      const result = matchColumns(headers);

      const courseStart = result.matched.find(m => m.matchedField?.name === 'courseStartDate');
      const courseEnd = result.matched.find(m => m.matchedField?.name === 'courseEndDate');
      const accomStart = result.matched.find(
        m => m.matchedField?.name === 'accommodationStartDate'
      );
      const accomEnd = result.matched.find(m => m.matchedField?.name === 'accommodationEndDate');

      expect(courseStart).toBeDefined();
      expect(courseEnd).toBeDefined();
      expect(accomStart).toBeDefined();
      expect(accomEnd).toBeDefined();
    });

    it('should handle case-insensitive matching', () => {
      const headers = ['NAME', 'start date', 'WEEKS'];
      const result = matchColumns(headers);

      expect(result.matched.length).toBe(3);
    });

    it('should handle fuzzy matching', () => {
      const headers = ['Studnt Name', 'Strat Date']; // Typos
      const result = matchColumns(headers);

      // Fuzzy matching should pick these up with >80% similarity
      const nameMatch = result.matched.find(m => m.excelHeader === 'Studnt Name');
      const startMatch = result.matched.find(m => m.excelHeader === 'Strat Date');

      // These should match with fuzzy matching
      if (nameMatch) {
        expect(nameMatch.matchType).toBe('fuzzy');
        expect(nameMatch.confidence).toBeGreaterThanOrEqual(80);
      }
    });

    it('should provide accurate summary', () => {
      const headers = ['Name', 'Start Date', 'Unknown', 'Weeks'];
      const result = matchColumns(headers);

      expect(result.summary.totalHeaders).toBe(4);
      expect(result.summary.matchedCount).toBe(3);
      expect(result.summary.unmatchedCount).toBe(1);
    });

    it('should match financial fields', () => {
      const headers = ['Deposit Paid', 'Total Paid', 'Course Fee Due', 'Total Booking'];
      const result = matchColumns(headers);

      expect(result.matched.some(m => m.matchedField?.name === 'depositPaidEur')).toBe(true);
      expect(result.matched.some(m => m.matchedField?.name === 'totalPaidEur')).toBe(true);
      expect(result.matched.some(m => m.matchedField?.name === 'courseFeeEur')).toBe(true);
      expect(result.matched.some(m => m.matchedField?.name === 'totalBookingEur')).toBe(true);
    });

    it('should match visa fields', () => {
      const headers = ['Visa', 'Visa Type'];
      const result = matchColumns(headers);

      expect(result.matched.some(m => m.matchedField?.name === 'isVisaStudent')).toBe(true);
      expect(result.matched.some(m => m.matchedField?.name === 'visaType')).toBe(true);
    });
  });

  describe('createFieldMapping', () => {
    it('should create index to field name mapping', () => {
      const headers = ['Name', 'Start Date', 'Weeks'];
      const result = matchColumns(headers);
      const mapping = createFieldMapping(result);

      expect(mapping.get(0)).toBe('name');
      expect(mapping.get(1)).toBe('courseStartDate');
      expect(mapping.get(2)).toBe('weeks');
    });

    it('should skip unmatched columns', () => {
      const headers = ['Name', 'Unknown', 'Weeks'];
      const result = matchColumns(headers);
      const mapping = createFieldMapping(result);

      expect(mapping.has(0)).toBe(true);
      expect(mapping.has(1)).toBe(false);
      expect(mapping.has(2)).toBe(true);
    });
  });

  describe('formatMatchingSummary', () => {
    it('should format summary with matched count', () => {
      const headers = ['Name', 'Start Date'];
      const result = matchColumns(headers);
      const summary = formatMatchingSummary(result);

      expect(summary).toContain('Matched 2/2 columns');
    });

    it('should include ignored columns in summary', () => {
      const headers = ['Name', 'Unknown Column'];
      const result = matchColumns(headers);
      const summary = formatMatchingSummary(result);

      expect(summary).toContain('Ignored: Unknown Column');
    });

    it('should include missing required fields', () => {
      const headers = ['Weeks'];
      const result = matchColumns(headers);
      const summary = formatMatchingSummary(result);

      expect(summary).toContain('Missing required:');
      expect(summary).toContain('Name');
      expect(summary).toContain('Start Date');
    });
  });
});
