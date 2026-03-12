/**
 * Schema Registry Tests
 */

import {
  IMPORTABLE_FIELDS,
  FIELD_MAP,
  getRequiredFields,
  getEditableFields,
  getIdentityFields,
  getFieldsByTable,
  getField,
  buildAliasMap,
  normalizeForMatching,
} from '../schema-registry';

describe('Schema Registry', () => {
  describe('IMPORTABLE_FIELDS', () => {
    it('should have defined fields', () => {
      expect(IMPORTABLE_FIELDS.length).toBeGreaterThan(0);
    });

    it('should have required fields: name and courseStartDate', () => {
      const nameField = IMPORTABLE_FIELDS.find(f => f.name === 'name');
      const startDateField = IMPORTABLE_FIELDS.find(f => f.name === 'courseStartDate');

      expect(nameField).toBeDefined();
      expect(nameField?.required).toBe(true);
      expect(startDateField).toBeDefined();
      expect(startDateField?.required).toBe(true);
    });

    it('should have identity fields marked', () => {
      const identityFields = IMPORTABLE_FIELDS.filter(f => f.isIdentity);
      expect(identityFields.length).toBeGreaterThan(0);
      expect(identityFields.some(f => f.name === 'name')).toBe(true);
    });

    it('should have proper table assignments', () => {
      const validTables = ['users', 'students', 'enrollments', 'bookings', 'classes'];
      for (const field of IMPORTABLE_FIELDS) {
        expect(validTables).toContain(field.table);
      }
    });

    it('should have proper types', () => {
      const validTypes = ['string', 'number', 'date', 'boolean', 'currency'];
      for (const field of IMPORTABLE_FIELDS) {
        expect(validTypes).toContain(field.type);
      }
    });
  });

  describe('FIELD_MAP', () => {
    it('should map all field names', () => {
      expect(FIELD_MAP.size).toBe(IMPORTABLE_FIELDS.length);
    });

    it('should retrieve fields by name', () => {
      const nameField = FIELD_MAP.get('name');
      expect(nameField).toBeDefined();
      expect(nameField?.label).toBe('Name');
    });
  });

  describe('getRequiredFields', () => {
    it('should return only required fields', () => {
      const required = getRequiredFields();
      expect(required.every(f => f.required)).toBe(true);
      expect(required.length).toBeGreaterThan(0);
    });
  });

  describe('getEditableFields', () => {
    it('should return only editable fields', () => {
      const editable = getEditableFields();
      expect(editable.every(f => f.editable)).toBe(true);
      expect(editable.length).toBeGreaterThan(0);
    });

    it('should include identity fields that are now editable', () => {
      const editable = getEditableFields();
      const identityNames = getIdentityFields().map(f => f.name);
      // Identity fields (name, email) are now editable per plan requirements
      expect(editable.some(f => identityNames.includes(f.name))).toBe(true);
    });
  });

  describe('getIdentityFields', () => {
    it('should return fields marked as identity', () => {
      const identity = getIdentityFields();
      expect(identity.every(f => f.isIdentity)).toBe(true);
      expect(identity.some(f => f.name === 'name')).toBe(true);
    });
  });

  describe('getFieldsByTable', () => {
    it('should return fields for users table', () => {
      const userFields = getFieldsByTable('users');
      expect(userFields.every(f => f.table === 'users')).toBe(true);
      expect(userFields.some(f => f.name === 'name')).toBe(true);
    });

    it('should return fields for enrollments table', () => {
      const enrollmentFields = getFieldsByTable('enrollments');
      expect(enrollmentFields.every(f => f.table === 'enrollments')).toBe(true);
      expect(enrollmentFields.some(f => f.name === 'courseStartDate')).toBe(true);
    });

    it('should return fields for bookings table', () => {
      const bookingFields = getFieldsByTable('bookings');
      expect(bookingFields.every(f => f.table === 'bookings')).toBe(true);
      expect(bookingFields.some(f => f.name === 'totalBookingEur')).toBe(true);
    });
  });

  describe('getField', () => {
    it('should return field by name', () => {
      const field = getField('weeks');
      expect(field).toBeDefined();
      expect(field?.type).toBe('number');
    });

    it('should return undefined for unknown field', () => {
      const field = getField('unknownField');
      expect(field).toBeUndefined();
    });
  });

  describe('normalizeForMatching', () => {
    it('should lowercase and trim', () => {
      expect(normalizeForMatching('  Start Date  ')).toBe('start date');
    });

    it('should remove special characters', () => {
      expect(normalizeForMatching('Level/Class')).toBe('levelclass');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeForMatching('Course   Name')).toBe('course name');
    });
  });

  describe('buildAliasMap', () => {
    it('should build a map of aliases', () => {
      const aliasMap = buildAliasMap();
      expect(aliasMap.size).toBeGreaterThan(0);
    });

    it('should map aliases to field names', () => {
      const aliasMap = buildAliasMap();
      expect(aliasMap.get('student name')).toBe('name');
      expect(aliasMap.get('start date')).toBe('courseStartDate');
      expect(aliasMap.get('weeks')).toBe('weeks');
    });

    it('should map display labels', () => {
      const aliasMap = buildAliasMap();
      expect(aliasMap.get('name')).toBe('name');
      expect(aliasMap.get('course')).toBe('courseName');
    });
  });
});
