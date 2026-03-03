/**
 * Verification Library Unit Tests
 * Tests for contact verification utilities
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #9
 */

import { generateVerificationCode, maskContactValue } from '@/lib/verification';

describe('Verification Library', () => {
  describe('generateVerificationCode', () => {
    it('should generate a 6-digit string', () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes on each call', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }
      // With cryptographic randomness, we should get many unique codes
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should always pad to 6 digits', () => {
      // Generate many codes to ensure padding works
      for (let i = 0; i < 50; i++) {
        const code = generateVerificationCode();
        expect(code.length).toBe(6);
        expect(parseInt(code, 10)).toBeLessThanOrEqual(999999);
        expect(parseInt(code, 10)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('maskContactValue', () => {
    describe('email masking', () => {
      it('should mask email showing first char and domain', () => {
        expect(maskContactValue('email', 'john@example.com')).toBe('j***@example.com');
        expect(maskContactValue('email', 'alice.smith@company.org')).toBe('a***@company.org');
      });

      it('should handle single character local part', () => {
        expect(maskContactValue('email', 'a@test.com')).toBe('a***@test.com');
      });

      it('should handle invalid email format gracefully', () => {
        expect(maskContactValue('email', 'notanemail')).toBe('***');
      });

      it('should handle empty string', () => {
        expect(maskContactValue('email', '')).toBe('***');
      });
    });

    describe('phone masking', () => {
      it('should show last 4 digits for phone', () => {
        expect(maskContactValue('phone', '+1 (555) 123-4567')).toBe('***4567');
        expect(maskContactValue('phone', '0871234567')).toBe('***4567');
      });

      it('should handle phone with only digits', () => {
        expect(maskContactValue('phone', '1234567890')).toBe('***7890');
      });

      it('should handle short phone numbers', () => {
        expect(maskContactValue('phone', '123')).toBe('***');
      });

      it('should handle international format', () => {
        expect(maskContactValue('phone', '+353 87 123 4567')).toBe('***4567');
      });
    });
  });
});
