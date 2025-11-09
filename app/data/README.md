# CEFR Data ETL Process

This directory contains CEFR (Common European Framework of Reference) descriptor data and tools for parsing and loading it into the database.

## Overview

The CEFR ETL (Extract, Transform, Load) process allows you to:
1. **Extract**: Parse CEFR descriptors from CSV files
2. **Transform**: Validate and structure the data
3. **Load**: Seed the database with the descriptors

## CSV File Format

CEFR data should be provided in CSV format with the following structure:

### Column Specification

| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| Level | Yes | String | CEFR level (A1, A2, B1, B2, C1, C2) | `A1` |
| Category | Yes | String | Skill category | `Reading`, `Writing`, `Listening`, `Speaking` |
| Subcategory | No | String | Specific subcategory | `Overall Reading Comprehension` |
| Descriptor Text | Yes | String | The actual CEFR descriptor | `Can understand very short, simple texts...` |
| Metadata | No | JSON | Additional metadata as JSON object | `{"skill_type": "receptive"}` |

### Example CSV

```csv
Level,Category,Subcategory,Descriptor Text,Metadata
A1,Reading,Overall Reading Comprehension,"Can understand very short, simple texts a single phrase at a time, picking up familiar names, words and basic phrases and rereading as required.","{""skill_type"": ""receptive"", ""domain"": ""general""}"
A1,Writing,Overall Written Production,Can write simple isolated phrases and sentences.,"{""skill_type"": ""productive"", ""domain"": ""general""}"
A2,Reading,Overall Reading Comprehension,"Can understand short, simple texts on familiar matters.","{""skill_type"": ""receptive""}"
```

### Important Notes

- **Headers**: The first row must contain column headers
- **Encoding**: UTF-8 encoding is required
- **Quotes**: Fields containing commas or newlines must be wrapped in double quotes
- **Escaping**: Double quotes within fields must be escaped with another double quote (`""`)
- **Metadata**: Must be valid JSON; if invalid, it will be stored as a note

## Available Commands

### 1. Generate Sample Data

Creates a sample CSV file with 24 CEFR descriptors (4 per level):

```bash
npm run generate:cefr-sample
```

**Output**: `data/sample-cefr-descriptors.csv`

### 2. Parse CSV File

Validates and parses a CSV file without writing to the database:

```bash
npm run parse:cefr -- <path-to-csv-file>
```

**Example**:
```bash
npm run parse:cefr -- data/sample-cefr-descriptors.csv
```

**Output**:
- Summary of parsed descriptors by level
- Sample descriptors preview
- Validation warnings and errors

### 3. Seed Database

Loads CEFR descriptors from a CSV file into the database:

```bash
npm run seed:cefr -- <path-to-csv-file>
```

**Example**:
```bash
npm run seed:cefr -- data/sample-cefr-descriptors.csv
```

**With Clear Flag** (removes existing descriptors first):
```bash
npm run seed:cefr -- data/sample-cefr-descriptors.csv -- --clear
```

**Output**:
- Progress indicator during insertion
- Summary of inserted descriptors by level
- Total count

## Complete Workflow Example

### Using Sample Data

1. **Generate sample data**:
   ```bash
   npm run generate:cefr-sample
   ```

2. **Validate the data** (optional):
   ```bash
   npm run parse:cefr -- data/sample-cefr-descriptors.csv
   ```

3. **Seed the database**:
   ```bash
   npm run seed:cefr -- data/sample-cefr-descriptors.csv
   ```

### Using Your Own Data

1. **Create your CSV file** following the format specification above
2. **Place it in the `data/` directory** (or any location)
3. **Parse to validate**:
   ```bash
   npm run parse:cefr -- data/my-cefr-data.csv
   ```

4. **Seed the database**:
   ```bash
   npm run seed:cefr -- data/my-cefr-data.csv
   ```

## Data Validation

The parser performs the following validations:

### Level Validation
- Must be one of: A1, A2, B1, B2, C1, C2
- Case-insensitive (converted to uppercase)
- Required field

### Category Validation
- Required field
- No specific values enforced (flexible)
- Common categories: Reading, Writing, Listening, Speaking, Interaction, Production, Reception, Mediation

### Descriptor Text Validation
- Required field
- Cannot be empty
- No length restrictions

### Metadata Validation
- Optional field
- Must be valid JSON if provided
- Invalid JSON will be stored as `{"note": "<original value>"}`

## Database Schema

The descriptors are stored in the `cefr_descriptors` table:

```typescript
{
  id: uuid,                    // Auto-generated primary key
  level: string,               // CEFR level (A1-C2)
  category: string,            // Skill category
  subcategory: string | null,  // Optional subcategory
  descriptor_text: string,     // The descriptor
  metadata: jsonb,             // Optional metadata
  created_at: timestamp,       // Auto-generated
  updated_at: timestamp        // Auto-generated
}
```

## Troubleshooting

### Common Issues

**Issue**: `File not found`
- **Solution**: Check the file path is correct relative to the app directory

**Issue**: `No valid descriptors found`
- **Solution**: Ensure CSV has the correct format with headers and data rows

**Issue**: `Invalid level "XX"`
- **Solution**: Ensure levels are one of: A1, A2, B1, B2, C1, C2

**Issue**: `Database connection failed`
- **Solution**: Ensure `.env.local` has correct `DATABASE_URL` set

### Debug Mode

To see detailed parsing output, check the warnings section in the parse output:

```bash
npm run parse:cefr -- data/my-file.csv
```

## Best Practices

1. **Always parse before seeding**: Validate your CSV file first
2. **Use version control**: Keep CSV files in git for tracking changes
3. **Backup before clearing**: Use `--clear` flag carefully
4. **Consistent formatting**: Follow the CSV format strictly
5. **UTF-8 encoding**: Ensure your CSV is UTF-8 encoded
6. **Test with samples**: Use `generate:cefr-sample` to test the process

## Sample Data

The included sample data (`sample-cefr-descriptors.csv`) contains:
- 24 descriptors total
- 4 descriptors per level (A1, A2, B1, B2, C1, C2)
- Covers Reading, Writing, Listening, and Speaking skills
- Based on official CEFR framework (simplified for demonstration)

## Further Resources

- [CEFR Official Website](https://www.coe.int/en/web/common-european-framework-reference-languages)
- [Database Schema Documentation](../spec/08-database.md)
- [Curriculum Schema](../src/db/schema/curriculum.ts)

---

**Last Updated**: 2025-11-09
