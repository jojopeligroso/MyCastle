# Business Value Priority Analysis
## Admin Features by Strategic Impact

**Generated:** 2025-12-17
**Framework:** RICE (Reach × Impact × Confidence ÷ Effort)

---

## Tier 1: CRITICAL - Platform Cannot Function (MVP Blockers)

### 1. Academic Structure (Programmes & Courses)
**Business Value:** 🔴 **CRITICAL**
**Status:** ⚠️ Database schema missing

**Why Critical:**
- Cannot define what you teach
- Cannot organize curriculum hierarchy
- Cannot map to CEFR standards (regulatory requirement)
- Blocks: course creation, class assignment, student placement

**Impact:**
- **Reach:** 100% (affects all students, teachers, classes)
- **Impact:** 10/10 (platform non-functional without it)
- **Confidence:** 100%
- **Effort:** 2 weeks (schema + 4 CRUD pages)
- **RICE Score:** 500

**Immediate Actions:**
1. Create `programmes` and `courses` tables
2. Build CRUD pages
3. Migrate existing classes to link to courses
4. Enable CEFR mapping workflow

---

### 2. Room Management
**Business Value:** 🔴 **CRITICAL**
**Status:** ⚠️ Database schema missing

**Why Critical:**
- Cannot allocate physical resources
- Cannot prevent double-booking
- Cannot manage capacity constraints
- Timetable conflicts undetectable

**Impact:**
- **Reach:** 80% (all classes need rooms)
- **Impact:** 9/10 (operational chaos without it)
- **Confidence:** 100%
- **Effort:** 1 week
- **RICE Score:** 720

**Immediate Actions:**
1. Create `rooms` table
2. Add `room_id` to `classes` table
3. Build room allocation UI
4. Implement conflict detection

---

### 3. Student Bookings & Admissions
**Business Value:** 🔴 **CRITICAL**
**Status:** ⚠️ Database schema missing

**Why Critical:**
- Cannot track prospective students
- Cannot manage admissions pipeline
- Cannot confirm student intake
- Revenue pipeline invisible

**Impact:**
- **Reach:** 100% (all new students)
- **Impact:** 10/10 (no enrollments = no revenue)
- **Confidence:** 100%
- **Effort:** 2 weeks
- **RICE Score:** 500

**Immediate Actions:**
1. Create `enquiries` and `bookings` tables
2. Build enquiry management workflow
3. Build booking → enrolment conversion
4. Track conversion funnel

---

## Tier 2: HIGH VALUE - Compliance & Operations

### 4. Visa Compliance Tracking
**Business Value:** 🟠 **HIGH**
**Status:** ✅ Basic exists, needs enhancement

**Why High Value:**
- Regulatory requirement (legal obligation)
- Non-compliance = license loss
- Automated alerting prevents issues

**Impact:**
- **Reach:** 40% (visa students only, but high risk)
- **Impact:** 10/10 (legal/regulatory)
- **Confidence:** 90%
- **Effort:** 1 week (enhance existing)
- **RICE Score:** 360

**Enhancements Needed:**
1. Automated daily alerts
2. Risk scoring (early warning)
3. Letter generation workflow
4. Immigration advisor notification

---

### 5. Attendance Register Management
**Business Value:** 🟠 **HIGH**
**Status:** ✅ Basic exists, needs admin corrections

**Why High Value:**
- Regulatory requirement
- Attendance = visa compliance
- Teacher errors need admin override

**Impact:**
- **Reach:** 100% (all classes)
- **Impact:** 8/10 (compliance critical)
- **Confidence:** 90%
- **Effort:** 1 week
- **RICE Score:** 720

**Enhancements Needed:**
1. Anomaly detection
2. Admin correction workflow
3. Register locking (post-export)
4. Version history

---

### 6. Student Lifecycle (Letters, Certificates)
**Business Value:** 🟠 **HIGH**
**Status:** ❌ Missing (schema + pages)

**Why High Value:**
- Students need enrolment letters for visa applications
- Certificates are product deliverables
- Automated generation saves hours/week

**Impact:**
- **Reach:** 100% (all students need letters)
- **Impact:** 7/10 (manual workaround exists but inefficient)
- **Confidence:** 90%
- **Effort:** 2 weeks
- **RICE Score:** 315

**Required:**
1. Create `letters` and `certificates` tables
2. PDF template system
3. QR verification codes
4. Digital signing workflow

---

## Tier 3: MEDIUM VALUE - Operational Efficiency

### 7. Accommodation Management
**Business Value:** 🟡 **MEDIUM**
**Status:** ❌ Missing completely

**Why Medium Value:**
- Some schools offer accommodation, others don't
- Manual tracking works but inefficient
- Safeguarding compliance (Garda vetting)

**Impact:**
- **Reach:** 30% (accommodation students only)
- **Impact:** 6/10 (operational time saver)
- **Confidence:** 80%
- **Effort:** 2 weeks
- **RICE Score:** 72

**Required:**
1. Create `hosts` and `placements` tables
2. Host management workflow
3. Placement allocation system
4. Safeguarding expiry alerts

---

### 8. Teacher Quality & CPD Tracking
**Business Value:** 🟡 **MEDIUM**
**Status:** ❌ Missing completely

**Why Medium Value:**
- Quality assurance is regulatory requirement
- CPD tracking for accreditation
- Manual process works but time-consuming

**Impact:**
- **Reach:** 20% (teachers only)
- **Impact:** 6/10 (accreditation requirement)
- **Confidence:** 70%
- **Effort:** 2 weeks
- **RICE Score:** 42

**Required:**
1. Create `observations` and `cpd_activities` tables
2. Observation recording workflow
3. CPD assignment and tracking
4. Quality reports for accreditation

---

### 9. Financial Reporting
**Business Value:** 🟡 **MEDIUM**
**Status:** ⚠️ Basic invoicing exists, reports missing

**Why Medium Value:**
- Invoicing works
- Management needs visibility
- Aging report for cashflow

**Impact:**
- **Reach:** 10% (finance team only)
- **Impact:** 7/10 (business intelligence)
- **Confidence:** 90%
- **Effort:** 1 week
- **RICE Score:** 63

**Required:**
1. Aging report
2. Revenue dashboard
3. Payment reconciliation
4. Export to accounting software

---

## Tier 4: LOWER VALUE - Nice to Have

### 10. Lesson Templates & Materials Library
**Business Value:** 🟢 **LOWER**
**Status:** ❌ Missing

**Why Lower Priority:**
- Teachers can create lessons without templates
- Manual sharing works
- Centralized library is convenience, not necessity

**Impact:**
- **Reach:** 20% (teachers who want templates)
- **Impact:** 4/10 (time saver)
- **Confidence:** 60%
- **Effort:** 3 weeks
- **RICE Score:** 16

**Future:**
- Create after core operations stable
- Focus on reusable templates
- AI-enhanced suggestion engine

---

### 11. Advanced Search & Query Builder
**Business Value:** 🟢 **LOWER**
**Status:** ✅ Basic search exists

**Why Lower Priority:**
- Basic search works for most cases
- Power users benefit, but small audience
- Can add incrementally

**Impact:**
- **Reach:** 5% (power users only)
- **Impact:** 5/10 (efficiency for admins)
- **Confidence:** 70%
- **Effort:** 2 weeks
- **RICE Score:** 8.75

**Future:**
- Saved search filters
- Export search results
- Complex AND/OR queries

---

### 12. Backup Management UI
**Business Value:** 🟢 **LOWER**
**Status:** ❌ Missing (automated backups may exist at DB level)

**Why Lower Priority:**
- Database backups likely automated by Supabase
- Manual restore is rare event
- Can use Supabase console

**Impact:**
- **Reach:** 1% (IT admin only, rarely)
- **Impact:** 8/10 (disaster recovery)
- **Confidence:** 50%
- **Effort:** 1 week
- **RICE Score:** 4

**Future:**
- Only if Supabase backup tools insufficient
- Focus on restore testing process

---

## Implementation Roadmap by Business Value

### Sprint 1-2: Foundation (4 weeks)
**Objective:** Platform functional for core operations

1. **Academic Structure** (2 weeks)
   - Programmes & Courses tables + CRUD
   - CEFR mapping
   - Link classes to courses

2. **Room Management** (1 week)
   - Rooms table + CRUD
   - Conflict detection
   - Timetable integration

3. **Bookings & Admissions** (2 weeks)
   - Enquiries + Bookings tables
   - Admissions pipeline
   - Conversion tracking

**Expected Impact:** Platform can operate end-to-end (prospect → enrolment → class → attendance)

---

### Sprint 3-4: Compliance (4 weeks)
**Objective:** Meet regulatory requirements

1. **Visa Compliance Enhancement** (1 week)
   - Automated alerting
   - Risk scoring
   - Letter generation

2. **Attendance Admin Tools** (1 week)
   - Anomaly detection
   - Admin corrections
   - Register locking

3. **Student Lifecycle** (2 weeks)
   - Letters table + workflow
   - Certificates table + workflow
   - PDF generation + QR codes

4. **Financial Reporting** (1 week)
   - Aging report
   - Revenue dashboard

**Expected Impact:** Compliance-ready, audit-proof operations

---

### Sprint 5-6: Efficiency (4 weeks)
**Objective:** Reduce manual workload

1. **Accommodation** (2 weeks)
   - Hosts + Placements
   - Safeguarding tracking
   - Allocation workflow

2. **Quality & CPD** (2 weeks)
   - Observations
   - CPD tracking
   - Quality reports

**Expected Impact:** 10-15 hours/week time savings for admin staff

---

### Sprint 7+: Enhancements (Ongoing)
**Objective:** Continuous improvement

1. Lesson templates & materials
2. Advanced search
3. Workflow automation
4. Reporting enhancements

---

## ROI Estimates

### Phase 1 (Foundation)
- **Investment:** 4 weeks dev time
- **Return:** Platform operational, revenue-generating
- **Payback:** Immediate (unblocks business)

### Phase 2 (Compliance)
- **Investment:** 4 weeks dev time
- **Return:** License protection, audit readiness
- **Risk Mitigation:** Avoids potential €50k+ fines

### Phase 3 (Efficiency)
- **Investment:** 4 weeks dev time
- **Return:** 15 hours/week admin time × €25/hour = €375/week = €19.5k/year
- **Payback:** ~2 months

---

## Decision Framework

### Must Build Now (Tier 1)
- Programmes & Courses
- Room Management
- Bookings & Admissions

**Rationale:** Platform non-functional without these

### Should Build Soon (Tier 2)
- Visa compliance enhancements
- Attendance admin tools
- Student lifecycle (letters/certificates)

**Rationale:** Regulatory requirements + high ROI

### Can Build Later (Tier 3)
- Accommodation
- Quality & CPD
- Financial reporting

**Rationale:** Manual workarounds exist, but inefficient

### Nice to Have (Tier 4)
- Lesson templates
- Advanced search
- Backup UI

**Rationale:** Low reach, low impact, or alternatives exist

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ 100% of classes linked to courses
- ✅ Zero timetable conflicts
- ✅ Booking → enrolment conversion tracked
- ✅ Admin can create full term in < 2 hours

### Phase 2 Success Criteria
- ✅ 100% visa students monitored
- ✅ Zero late registers
- ✅ Letters generated in < 5 minutes
- ✅ Financial aging report available

### Phase 3 Success Criteria
- ✅ 80% accommodation placements tracked
- ✅ Teacher observations recorded quarterly
- ✅ CPD compliance > 90%

---

## Risks & Mitigations

### Risk: Schema changes break existing features
**Mitigation:**
- Comprehensive migration testing
- Backward compatibility checks
- Rollback plan

### Risk: User adoption of new workflows
**Mitigation:**
- Training sessions before launch
- In-app guides
- Gradual rollout (soft launch)

### Risk: Performance degradation with more tables
**Mitigation:**
- Proper indexing strategy
- Query optimization
- Caching where appropriate

---

## Recommendations

1. **Start with Tier 1 immediately** - These are MVP blockers
2. **Run Phases in parallel where possible** - Different teams can work on finance vs academic structure
3. **User feedback loops** - Weekly check-ins with admins during Phase 1
4. **Iterative releases** - Don't wait for "perfect" - ship incrementally
5. **Measure impact** - Track time savings and error reduction

---

**Next Step:** Get stakeholder approval for Phase 1 roadmap and allocate resources.
