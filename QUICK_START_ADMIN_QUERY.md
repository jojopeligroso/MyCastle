# Quick Start: Admin Query Interface

**For non-technical administrators who need to access data quickly**

---

## What is this?

The Admin Query Interface lets you ask questions and get answers from your MyCastle database using plain English - no SQL knowledge required!

**Think of it as**: "SQL for people who are afraid of SQL"

---

## How to Access

1. Log in to MyCastle admin panel
2. Navigate to `/admin/query`
3. Choose your preferred method:
   - **Natural Language** (easier, AI-powered)
   - **Query Builder** (more control, visual)

---

## Method 1: Natural Language (Recommended for Beginners)

### Step-by-Step

1. **Type your question** in plain English
   ```
   Example: "Show me all active students"
   ```

2. **Click "Translate to SQL"**
   - The AI will convert your question to SQL
   - You'll see the SQL query and an explanation

3. **Review the query**
   - Check that it matches what you want
   - Read the explanation to understand what it does

4. **Click "Execute Query"**
   - Results appear in a table
   - Export to CSV if needed

### Common Questions You Can Ask

#### Student Queries
```
"Show me all students"
"List active students in B1 level"
"Find students named John"
"Show students whose visas expire in the next 30 days"
"List students who joined this month"
```

#### Class Queries
```
"Show all classes"
"List classes starting this month"
"Show classes taught by [teacher name]"
"Find Pre-Intermediate classes"
```

#### Enrollment Queries
```
"Show all active enrollments"
"List enrollments ending soon"
"Show students enrolled in [class name]"
"Find enrollments from this month"
```

### Tips for Natural Language

✅ **DO**:
- Be specific: "Show **active** students in **B1 level**"
- Use dates: "Show enrollments from **this month**"
- Mention fields: "Show student **name** and **email**"

❌ **DON'T**:
- Be vague: "Show me stuff"
- Use jargon: "Give me all the FK relations"
- Ask for modifications: "Delete all students" (read-only!)

---

## Method 2: Query Builder (More Control)

### Step-by-Step

1. **Select a Table**
   - Choose from: users, classes, enrollments, courses, programmes
   - Each table has a description to help you choose

2. **Choose Columns** (optional)
   - Check boxes for columns you want to see
   - Leave empty to see all columns

3. **Add Filters** (optional)
   - Click "+ Add Filter"
   - Select column, operator (equals, contains, etc.), and value
   - Add multiple filters to narrow results

4. **Set Limit**
   - Default: 100 rows
   - Maximum: 1,000 rows

5. **Click "Run Query"**
   - Results appear immediately
   - Generated SQL shown for reference

### Example: Find Active Students in B1

1. **Table**: `users`
2. **Columns**: Select `name`, `email`, `current_level`, `status`
3. **Filters**:
   - `role` **Equals** `student`
   - `status` **Equals** `active`
   - `current_level` **Equals** `B1`
4. **Limit**: `100`
5. **Run Query**

---

## Exporting Results

### Export to CSV

1. Run your query
2. Click "Export CSV" button
3. File downloads immediately to your computer
4. Open in Excel, Google Sheets, or any spreadsheet software

### What You Can Do with Exports

- Share with colleagues
- Import into other systems
- Create reports
- Analyze in Excel

---

## Common Tasks

### Task 1: View All Students

**Natural Language**:
```
"Show me all students"
```

**Query Builder**:
- Table: `users`
- Filters: `role` Equals `student`

---

### Task 2: Visa Expiring Report

**Natural Language**:
```
"Show students whose visas expire in the next 30 days"
```

**Query Builder**:
- Table: `users`
- Filters:
  - `visa_expiry` Greater Than `[today's date]`
  - `visa_expiry` Less Than `[today + 30 days]`

---

### Task 3: Find Specific Student

**Natural Language**:
```
"Find student named John Smith"
```

**Query Builder**:
- Table: `users`
- Filters:
  - `role` Equals `student`
  - `name` Contains `John Smith`

---

### Task 4: Class Roster

**Natural Language**:
```
"Show all students in Pre-Intermediate class"
```

**Note**: This requires a JOIN, so Natural Language works better than Query Builder for this task.

---

### Task 5: Recent Enrollments

**Natural Language**:
```
"Show enrollments from this month"
```

**Query Builder**:
- Table: `enrollments`
- Filters: `created_at` Greater Than `[first day of month]`

---

## Safety & Security

### What You CAN Do

✅ **View data** (SELECT queries)
✅ **Filter and search**
✅ **Export to CSV**
✅ **Ask "What if" questions**

### What You CAN'T Do

❌ **Delete data** (read-only mode)
❌ **Modify data** (unless explicitly confirmed)
❌ **See data you're not authorized for** (RLS enforced)
❌ **Break the database** (multiple safety checks)

### Automatic Safety Features

1. **Read-Only by Default**: Only SELECT queries allowed
2. **Row Level Security (RLS)**: You only see data you're authorized for
3. **Query Timeout**: Queries stop after 5 seconds if too slow
4. **Row Limit**: Maximum 1,000 rows per query
5. **Validation**: Dangerous keywords blocked automatically

---

## Troubleshooting

### "Failed to translate query"

**Problem**: The AI couldn't understand your question.

**Solution**:
- Try rephrasing more clearly
- Be more specific
- Use the Query Builder instead

**Example**:
- ❌ "Show me the things"
- ✅ "Show me all active students"

---

### "Query timed out"

**Problem**: Your query is too complex or returns too much data.

**Solution**:
- Add more filters to narrow results
- Select fewer columns
- Increase specificity

**Example**:
- ❌ "Show me everything"
- ✅ "Show me students in B1 level created this month"

---

### "No results found"

**Problem**: Your filters are too restrictive or data doesn't exist.

**Solution**:
- Remove some filters
- Check spelling
- Verify date ranges

---

### "SQL syntax error"

**Problem**: The generated SQL has an error.

**Solution**:
- Try Natural Language instead of Query Builder
- Contact support if issue persists
- Use simpler filters

---

## Best Practices

### 1. Start Simple

✅ Begin with: "Show me all students"
❌ Don't start with: "Show me all students with enrollments in classes that have teachers who..."

### 2. Use Filters Progressively

✅ Add filters one at a time:
1. "Show me all students"
2. Add: "...who are active"
3. Add: "...in B1 level"

### 3. Export Early and Often

- Export results immediately after running query
- Don't wait until you've lost your query
- Save exports with descriptive names

### 4. Save Common Queries

- Copy successful queries to a document
- Create a personal cheat sheet
- Share useful queries with colleagues

---

## Examples by User Role

### Registrar

**Common Tasks**:
- View all students by level
- Check visa expiry dates
- Generate class rosters
- Track recent enrollments

**Example Queries**:
```
"Show students in each CEFR level"
"List students whose visas expire this month"
"Show all students in Morning Intensive class"
"Show enrollments from last week"
```

---

### Academic Director

**Common Tasks**:
- Monitor class capacities
- Track student progress
- Review course enrollments
- Analyze level distribution

**Example Queries**:
```
"Show all classes with current enrollment count"
"List students who completed B1 level"
"Show courses by programme"
"Find students at risk (attendance < 80%)"
```

---

### Finance Officer

**Common Tasks**:
- Track enrollment payments
- Generate invoices
- Monitor outstanding balances
- Export financial reports

**Example Queries**:
```
"Show all active enrollments with payment status"
"List students with unpaid invoices"
"Show enrollments ending this month"
"Find students with balance > 0"
```

---

## Getting Help

### Self-Help

1. **Read inline hints**: Hover over ? icons
2. **Check examples**: Use Quick Action cards
3. **Try Natural Language first**: Often easier than Query Builder
4. **Review generated SQL**: Learn from successful queries

### Support

- **Email**: eoin@mycastle.app
- **Documentation**: See MINIMUM_LOVABLE_PRODUCT.md
- **Migration Guide**: See MIGRATION_GUIDE.md

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Focus query input | `Ctrl + /` |
| Execute query | `Ctrl + Enter` |
| Export CSV | `Ctrl + E` |
| Clear query | `Ctrl + K` |

---

## FAQ

### Q: Can I break anything?

**A**: No! The interface is read-only by default. You can view data but can't modify or delete it without explicit confirmation.

---

### Q: Why did my query fail?

**A**: Common reasons:
- Too complex (try simpler filters)
- Timeout (query took > 5 seconds)
- Syntax error (use Natural Language mode)
- No matching data (check filters)

---

### Q: How do I save a query for later?

**A**: Currently, copy the Natural Language question or generated SQL to a document. Query template feature coming soon!

---

### Q: Can I schedule recurring reports?

**A**: Not yet, but coming in Phase 2. For now, export manually and save.

---

### Q: What's the difference between Natural Language and Query Builder?

**A**:
- **Natural Language**: Easier, AI-powered, best for complex queries
- **Query Builder**: More control, visual, best for simple filters

Try Natural Language first, fall back to Query Builder if needed.

---

## What's Next?

### Phase 2 Features (Coming Soon)

- **Query Templates**: Save and reuse common queries
- **Scheduled Queries**: Run queries automatically
- **Advanced Visualizations**: Charts and graphs
- **Batch Operations**: Bulk updates with confirmation
- **Query History**: See and replay previous queries

---

## Success Story

**Before** (Old Way):
> "I needed to find all students whose visas expired in March. I had to email IT, wait 30 minutes for a CSV, then filter it manually in Excel. Total time: 45 minutes."

**After** (Query Interface):
> "I typed: 'Show students whose visas expire in March'. Got results in 3 seconds. Exported to CSV. Total time: 1 minute."

**Time Saved**: 98%

---

## Your Turn!

Try these beginner queries right now:

1. "Show me all students"
2. "List active students"
3. "Find students in B1 level"

Then explore more complex queries as you get comfortable!

---

**Version**: 1.0
**Last Updated**: 2026-01-10
**For Support**: eoin@mycastle.app
