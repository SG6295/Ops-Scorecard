# Ops Scorecard - Product Requirements Document (PRD)

## Product Overview

**Name:** Ops Scorecard  
**Type:** Internal web application  
**Purpose:** Calculate and display monthly performance scorecards for drivers, supervisors, and managers based on operational data from Roorides.

**Core Value Proposition:**  
Replace manual Excel-based scorecard generation (1-3 hours/month) with automated calculation and multi-level views (< 5 minutes/month).

---

## Product Goals

### Primary Goals
1. **Automate scorecard generation** - Eliminate manual copy-paste from 6+ Excel sheets
2. **Multi-level visibility** - Show driver, supervisor, and manager scorecards
3. **Data quality enforcement** - Validate inputs before calculation
4. **Historical tracking** - Enable month-over-month trend analysis (V2)

### Success Metrics
- Time to generate scorecard: < 5 minutes (vs. 1-3 hours currently)
- % of uploads passing validation on first attempt
- Monthly active users (internal ops team)
- Number of manual corrections required

---

## User Personas

### Primary User: Operations Manager
- **Needs:** Monthly driver scorecards for performance reviews
- **Pain points:** Manual data entry, calculation errors, inconsistent formatting
- **Usage pattern:** Monthly, first week of new month

### Secondary User: Site Supervisor
- **Needs:** Team performance visibility, individual driver scores
- **Pain points:** No consolidated view of team performance
- **Usage pattern:** Monthly review, ad-hoc driver performance checks

### Tertiary User: Area Manager (AM/DM)
- **Needs:** Multi-site performance comparison, manager scorecards
- **Pain points:** Aggregating across supervisors manually
- **Usage pattern:** Monthly strategic review

---

## User Interface Structure

### Navigation (Top Level)

```
┌─────────────────────────────────────────────────────────────┐
│  Ops Scorecard                              [User] [Logout] │
├─────────────────────────────────────────────────────────────┤
│  [Scorecard] [Upload Data]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Page 1: Scorecard (Default View)

**Purpose:** View generated scorecards by level

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Scorecard                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Month: [December 2025 ▼]    Level: [○ Driver              │
│                                       ○ Supervisor          │
│                                       ○ Manager]            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Driver Scores (234 drivers)                           │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Site          │ Driver Name    │ Total │ FPD │ Spare │ │
│  ├───────────────┼────────────────┼───────┼─────┼───────┤ │
│  │ Axon Inter... │ NVS 3666-Abhi..│ 85/100│20/20│ 20/20 │ │
│  │ BVM Global    │ NVS 1665-Mada..│ 72/100│10/20│ 20/20 │ │
│  │ ...           │ ...            │ ...   │ ... │ ...   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Export to Excel]  [View Details]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- **Month selector** - Dropdown to view historical months
- **Level selector** - Radio buttons for Driver / Supervisor / Manager
- **Score table** - Sortable, filterable data grid
- **Export button** - Download as Excel with breakdowns
- **View Details** - Drill down to individual scorecard

**Driver Score Table Columns:**
- Site
- Manager
- Supervisor
- Driver ID
- Driver Name
- Total Score (out of 100)
- FPD Score (out of 20)
- Spare Usage Score (out of 20)
- Speed Violation Score (out of 20)
- Incident Score (out of 20)
- Mileage Score (out of 10)
- Exterior Score (out of 10)

**Supervisor Score Table Columns:**
- Site
- Manager
- Supervisor Name
- Total Score (out of 100)
- OTA Score (out of 20)
- Maintenance Score (out of 10)
- Driver Performance Score (out of 20)
- Dry Run Score (out of 15)
- Documentation Score (out of 15)
- App Usage Score (out of 20)

**Manager Score Table Columns:**
- Manager Name
- Total Score (out of 100)
- CSAT Score (out of 30)
- Team Performance Score (out of 35)
- Training Score (out of 15)
- Client Reference Score (out of 20)

### Page 2: Upload Data

**Purpose:** Upload monthly operational data for scorecard generation

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Upload Data                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Month: [January 2026 ▼]                                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Step 1: Upload Raw Data                               │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │ Trip Data (from Roorides)                              │ │
│  │ [Choose File] trips_january_2026.csv      [✓ Uploaded]│ │
│  │ 15,234 trips detected                                  │ │
│  │                                                         │ │
│  │ Spare Usage Data                                       │ │
│  │ [Choose File] spares_january_2026.csv     [✓ Uploaded]│ │
│  │ 47 spare usage records detected                        │ │
│  │                                                         │ │
│  │ Fuel/Diesel Data                                       │ │
│  │ [Choose File] diesel_january_2026.csv     [✓ Uploaded]│ │
│  │ 156 vehicle fuel logs detected                         │ │
│  │                                                         │ │
│  │ Hierarchy Mapping                                      │ │
│  │ [Choose File] hierarchy_january_2026.csv  [✓ Uploaded]│ │
│  │ 23 sites, 45 supervisors, 12 managers                  │ │
│  │                                                         │ │
│  │ [Optional] Incident Data                               │ │
│  │ [Choose File] incidents_january_2026.csv  [ Uploaded] │ │
│  │                                                         │ │
│  │ [Optional] Vehicle Inspection Data                     │ │
│  │ [Choose File] inspections_january_2026.csv[ Uploaded] │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Step 2: Validation                                    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │ [Validate Data]                                        │ │
│  │                                                         │ │
│  │ ✓ 234 unique drivers detected                          │ │
│  │ ✓ All drivers have site assignments                    │ │
│  │ ✓ No duplicate trip IDs                                │ │
│  │ ⚠ Warning: 3 drivers missing from hierarchy mapping    │ │
│  │   - NVS 9999, NVS 8888, NVS 7777                       │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Step 3: Calculate & Generate                          │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │ [Calculate Metrics]  [Generate Scores]                 │ │
│  │                                                         │ │
│  │ Status: Ready to calculate                             │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Upload Flow:**
1. **Select Month** - Choose target month for scorecard
2. **Upload Files** - Drag & drop or file picker for each required file
3. **Auto-validate** - Real-time validation as files are uploaded
4. **Show Preview** - Display first 10 rows of uploaded data
5. **Calculate Metrics** - Button to aggregate trip data → driver metrics
6. **Generate Scores** - Button to apply scoring rules → driver scores
7. **Redirect to Scorecard** - Automatically navigate to view results

**Validation Rules:**
- Required files: Trip Data, Hierarchy Mapping
- Optional files: Spare Usage, Fuel Data, Incidents, Inspections
- Driver IDs must be consistent across all files
- No duplicate records (by composite keys)
- Dates must fall within selected month
- Numeric fields must be valid numbers

---

## Data Architecture

### 3-Layer Pipeline

```
RAW FACTS → CALCULATED METRICS → SCORED RESULTS
(Layer 1)      (Layer 2)            (Layer 3)
```

### Layer 1: Raw Facts (Input Data)

**Source:** Uploaded CSV/Excel files from Roorides

**Tables:**
```sql
-- Trip-level data (from Roorides trip export)
trip_facts (
  month_run_id, trip_id, driver_id, vehicle_no, site,
  trip_date, is_first_point_late, has_speed_violation, 
  dry_run_km
)

-- Spare driver usage logs
spare_usage_facts (
  month_run_id, driver_id, usage_date, spare_driver_name
)

-- Fuel/diesel logs per vehicle
fuel_facts (
  month_run_id, vehicle_no, driver_id, total_km, 
  diesel_liters, expected_mileage, actual_mileage
)

-- Site → Supervisor → Manager hierarchy
hierarchy_mapping (
  month_run_id, site, supervisor, manager
)

-- Incident logs (optional, may be pre-scored)
incident_facts (
  month_run_id, driver_id, incident_date, 
  incident_type, severity
)

-- Vehicle inspection logs (optional, may be pre-scored)
inspection_facts (
  month_run_id, vehicle_no, driver_id, inspection_date,
  issue_count, issue_type
)
```

### Layer 2: Calculated Metrics (Derived)

**Source:** Aggregated from Layer 1 raw facts

**Tables:**
```sql
-- Driver-level metrics (one row per driver per month)
driver_metrics (
  month_run_id, driver_id, driver_name, site, 
  supervisor, manager,
  
  -- FPD metrics
  fpd_total_trips, fpd_late_trips, fpd_pct,
  
  -- Spare metrics
  spare_usage_count,
  
  -- Speed metrics
  speed_violation_count,
  
  -- Mileage metrics
  expected_mileage_km, actual_mileage_km, mileage_variance_pct,
  
  -- Incident metrics
  incident_count, has_zero_tolerance_incident,
  
  -- Inspection metrics
  exterior_issue_count,
  
  calculated_at
)

-- Supervisor-level metrics
supervisor_metrics (
  month_run_id, supervisor_id, supervisor_name, site, manager,
  
  -- OTA metrics
  ota_total_trips, ota_ontime_trips, ota_pct,
  
  -- Maintenance metrics
  maintenance_ticket_count,
  
  -- Dry run metrics
  dry_run_total_km, dry_run_vehicle_days, dry_run_per_vehicle_day,
  
  -- Documentation metrics
  total_employees, compliant_employees, documentation_pct,
  
  -- App usage metrics
  app_usage_total_trips, app_usage_used_trips, app_usage_pct,
  
  -- Aggregated driver performance
  avg_driver_score, driver_count,
  
  calculated_at
)

-- Manager-level metrics
manager_metrics (
  month_run_id, manager_id, manager_name,
  
  -- CSAT metrics
  csat_score_pct,
  
  -- Training metrics
  total_staff, trained_staff, training_attendance_pct,
  
  -- Client reference metrics
  mql_count, sql_count,
  
  -- Aggregated supervisor performance
  avg_supervisor_score, supervisor_count,
  
  calculated_at
)
```

### Layer 3: Scores (Rules Applied)

**Source:** Scoring rules applied to Layer 2 metrics

**Tables:**
```sql
-- Driver scores (one row per driver per month)
driver_scores (
  month_run_id, driver_id,
  
  -- Component scores
  fpd_score,              -- max 20
  spare_score,            -- max 20
  speed_score,            -- max 20
  incident_score,         -- max 20
  mileage_score,          -- max 10
  exterior_score,         -- max 10
  
  -- Total
  total_score,            -- max 100
  max_possible_score,     -- 100 (unless components skipped)
  
  -- Config snapshot (what rules were used)
  scoring_config,
  
  -- Flags
  has_zero_tolerance_override,
  
  scored_at
)

-- Supervisor scores
supervisor_scores (
  month_run_id, supervisor_id,
  
  -- Component scores
  ota_score,              -- max 20
  maintenance_score,      -- max 10
  driver_performance_score, -- max 20
  dry_run_score,          -- max 15
  documentation_score,    -- max 15
  app_usage_score,        -- max 20
  
  -- Total
  total_score,            -- max 100
  max_possible_score,
  scoring_config,
  scored_at
)

-- Manager scores
manager_scores (
  month_run_id, manager_id,
  
  -- Component scores
  csat_score,             -- max 30
  team_performance_score, -- max 35
  training_score,         -- max 15
  client_reference_score, -- max 20
  
  -- Total
  total_score,            -- max 100
  max_possible_score,
  scoring_config,
  scored_at
)
```

### Supporting Tables

```sql
-- Month run tracking
month_runs (
  id, month, status, created_by, created_at,
  metrics_calculated_at, scores_calculated_at
)

-- Users (Supabase Auth)
auth.users (
  id, email, created_at
)
```

---

## Scoring Components

### Driver Components (6 total, max 100 points)

#### 1. FPD - First Pickup Delay (max 20 points)
- **Metric:** FPD % = (late trips / total trips) × 100
- **Rules:**
  - < 9% → 20 points (excellent)
  - 10-15% → 10 points (acceptable)
  - > 16% → 0 points (poor)

#### 2. Spare Usage (max 20 points)
- **Metric:** Count of spare driver instances
- **Rules:**
  - ≤ 2 instances → 20 points
  - 3-4 instances → 10 points
  - ≥ 5 instances → 0 points

#### 3. Speed Violation (max 20 points)
- **Metric:** Count of speed violation events
- **Rules:**
  - 0-4 instances → 20 points
  - 5-9 instances → 10 points
  - ≥ 10 instances → 0 points

#### 4. Incidents (max 20 points)
- **Metric:** Count of incidents (uniform/ID missing, etc.)
- **Rules:**
  - 0 instances → 20 points
  - 1 instance → 10 points
  - ≥ 2 instances → 0 points
- **Override:** Zero-tolerance incidents (drunk driving, misbehavior, client escalation) → total score = 0

#### 5. Mileage Variation (max 10 points)
- **Metric:** Variance % = |actual - expected| / expected × 100
- **Rules:**
  - < 5% variance → 10 points
  - ≥ 5% variance → 0 points

#### 6. Vehicle Exterior/Cleanliness (max 10 points)
- **Metric:** Count of exterior cleanliness issues
- **Rules:**
  - 0 instances → 10 points
  - 1 instance → 5 points
  - ≥ 2 instances → 0 points

### Supervisor Components (6 total, max 100 points)

#### 1. OTA - On-Time Arrival (max 20 points)
- **Metric:** OTA % = (on-time trips / total trips) × 100
- **Rules:**
  - > 85% → 20 points
  - > 75% → 10 points
  - < 75% → 0 points

#### 2. Maintenance Tickets (max 10 points)
- **Metric:** Count of maintenance tickets raised
- **Rules:**
  - ≥ 30 tickets → 10 points
  - < 30 tickets → 0 points

#### 3. Driver Performance (max 20 points)
- **Metric:** Average of driver total scores
- **Rules:**
  - > 75 avg → 20 points
  - > 65 avg → 10 points
  - < 65 avg → 0 points

#### 4. Dry Run (max 15 points)
- **Metric:** Dry run km per vehicle-day
- **Rules:**
  - < 5 km → 15 points
  - ≤ 7 km → 10 points
  - > 7 km → 0 points

#### 5. Employee Documentation (max 15 points)
- **Metric:** Compliance % = (compliant employees / total employees) × 100
- **Rules:**
  - > 95% → 15 points
  - 90-95% → 10 points
  - < 90% → 0 points

#### 6. Driver App Usage (max 20 points)
- **Metric:** App usage % = (app-tracked trips / total trips) × 100
- **Rules:**
  - > 90% → 20 points
  - > 80% → 10 points
  - < 80% → 0 points

### Manager Components (4 total, max 100 points)

#### 1. CSAT (max 30 points)
- **Metric:** CSAT score % (from customer surveys)
- **Rules:**
  - Score = 30 × (CSAT % / 100)
  - Example: 85% CSAT → 25.5 points

#### 2. Team Performance (max 35 points)
- **Metric:** Average of supervisor total scores
- **Rules:**
  - > 95 avg → 35 points
  - > 80 avg → 20 points
  - < 80 avg → 0 points

#### 3. Monthly Training (max 15 points)
- **Metric:** Training attendance % = (trained staff / total staff) × 100
- **Rules:**
  - ≥ 75% → 15 points
  - < 75% → 0 points

#### 4. New Client Reference (max 20 points)
- **Metric:** Count of MQLs (Marketing Qualified Leads) and SQLs (Sales Qualified Leads)
- **Rules:**
  - 2 MQLs → 20 points
  - 1 SQL → 10 points
  - 0 → 0 points

---

## Functional Requirements

### FR-1: Authentication
- Users must log in with email + password (Supabase Auth)
- Only authenticated users can access the app
- Session persists across browser sessions

### FR-2: Month Run Management
- Create new month run for data upload
- View list of all historical month runs
- Delete month run (with cascade delete of all data)

### FR-3: Data Upload
- Upload CSV/Excel files via drag & drop or file picker
- Support multiple file formats (.csv, .xlsx, .xls)
- Max file size: 10MB per file
- Show upload progress and file size

### FR-4: Data Validation
- Validate schema (required columns present)
- Validate data types (numeric fields are numbers)
- Validate business rules (driver IDs consistent, no duplicates)
- Display human-readable error messages
- Block calculation if validation fails

### FR-5: Metrics Calculation
- Aggregate trip data to driver-level metrics
- Calculate FPD %, spare count, speed violations, mileage variance
- Resolve driver → site → supervisor → manager hierarchy
- Store calculated metrics in database

### FR-6: Score Calculation
- Apply scoring rules to metrics
- Support component-based scoring (6 components for drivers)
- Apply zero-tolerance overrides
- Store scoring config snapshot with each score

### FR-7: Scorecard Display
- View driver/supervisor/manager scores in table format
- Filter by site, supervisor, manager
- Sort by any column
- Pagination for large datasets (> 100 rows)

### FR-8: Excel Export
- Generate Excel file with multiple sheets:
  - Sheet 1: Scores summary
  - Sheet 2: Component breakdown
  - Sheet 3: Raw metrics
- Download as .xlsx format
- Include month and generation timestamp in filename

### FR-9: Drill-Down
- Click driver row to view detailed scorecard
- Show component-level breakdown
- Show raw metrics that contributed to score
- Link back to full table

---

## Non-Functional Requirements

### NFR-1: Performance
- Handle up to 5,000 drivers per month
- Calculation time < 30 seconds
- Page load time < 2 seconds
- Excel export generation < 10 seconds

### NFR-2: Security
- All data stored in private Supabase buckets
- Row-level security on database tables
- HTTPS only
- No sensitive data in URLs or logs

### NFR-3: Reliability
- 99% uptime (Vercel + Supabase SLAs)
- Automatic database backups (Supabase)
- Error logging (Vercel logs)
- Graceful error handling (show friendly messages)

### NFR-4: Usability
- Mobile-responsive (but optimized for desktop)
- Accessible (WCAG 2.1 Level AA)
- Clear error messages
- Loading indicators for async operations

### NFR-5: Data Retention
- Raw uploads: 12 months (configurable)
- Calculated metrics: Indefinite
- Scores: Indefinite (for trends)
- Month runs: Indefinite

---

## Development Phases

### Phase 1: Foundation + Manual Data Load (Week 1-2)
**Goal:** Get infrastructure set up, load January data manually

- [ ] Supabase project setup
- [ ] Database schema creation (all tables)
- [ ] Next.js app scaffolding
- [ ] Authentication (login/signup)
- [ ] Create SQL scripts to load January data
- [ ] Execute scripts, verify data loaded
- [ ] Basic scorecard view (read-only table)

**Deliverable:** Can view January driver scores in browser

### Phase 2: Metrics Calculation (Week 3-4)
**Goal:** Implement calculation layer

- [ ] FPD calculator (from trip_facts)
- [ ] Spare usage calculator (from spare_usage_facts)
- [ ] Speed violation calculator (from trip_facts)
- [ ] Mileage variance calculator (from fuel_facts)
- [ ] Hierarchy resolver (driver → site → supervisor → manager)
- [ ] Store in driver_metrics table
- [ ] UI to trigger calculation manually

**Deliverable:** Can calculate metrics from raw facts on demand

### Phase 3: Scoring Engine (Week 5-6)
**Goal:** Implement scoring layer

- [ ] FPD scoring component
- [ ] Spare scoring component
- [ ] Speed scoring component
- [ ] Incident scoring component
- [ ] Mileage scoring component
- [ ] Exterior scoring component
- [ ] Scoring orchestrator (sum components, apply overrides)
- [ ] Store in driver_scores table
- [ ] UI to trigger scoring manually

**Deliverable:** Can generate driver scores with component breakdown

### Phase 4: Excel Export (Week 7)
**Goal:** Export functionality

- [ ] Excel generation (ExcelJS or similar)
- [ ] Multi-sheet export (scores, breakdown, metrics)
- [ ] Download button
- [ ] Filename with month/timestamp

**Deliverable:** Can download driver scorecard as Excel

### Phase 5: Supervisor & Manager (Week 8-10)
**Goal:** Multi-level scorecards

- [ ] Supervisor metrics calculation
- [ ] Supervisor scoring components
- [ ] Manager metrics calculation
- [ ] Manager scoring components
- [ ] UI tabs for driver/supervisor/manager views
- [ ] Excel export for all levels

**Deliverable:** Full 3-level scorecard system

### Phase 6: Upload UI (Week 11-12)
**Goal:** Replace manual SQL scripts with UI

- [ ] File upload components
- [ ] Validation UI
- [ ] Preview tables
- [ ] Calculate + Score buttons
- [ ] Progress indicators

**Deliverable:** Can upload data via UI instead of SQL scripts

### Phase 7: Trends (Week 13-14)
**Goal:** Historical analysis (V2)

- [ ] Month-over-month trend queries
- [ ] Trend charts (line charts per component)
- [ ] Site/supervisor/manager filtering
- [ ] Trend export

**Deliverable:** Trend dashboards

---

## MVP Scope (First 6 Weeks)

**Must Have:**
- Driver scorecard view (read-only)
- Manual data loading (SQL scripts)
- Metrics calculation (FPD, spare, speed, mileage)
- Scoring engine (6 driver components)
- Excel export (driver scores only)

**Nice to Have (defer to V2):**
- Upload UI
- Supervisor/manager scorecards
- Trends
- Drill-down details
- Advanced filtering

**Explicitly Out of Scope (V1):**
- Automated email reports
- Real-time dashboards
- API ingestion (Roorides API)
- Role-based permissions (beyond login)
- Mobile app

---

## Technical Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Backend:**
- Next.js API Routes (serverless)
- Supabase Postgres (database)
- Supabase Auth (authentication)
- Supabase Storage (file uploads)

**Hosting:**
- Vercel (frontend + API)
- Supabase (database + auth + storage)

**Libraries:**
- ExcelJS (Excel export)
- SheetJS (Excel/CSV parsing)
- Zod (schema validation)
- TanStack Table (data grids)

---

## Open Questions

1. **Incident data source:** Do we have raw incident logs, or only pre-scored values?
2. **Inspection data source:** Do we have raw inspection logs, or only pre-scored values?
3. **CSAT data:** What's the source for CSAT scores? Email? Survey platform?
4. **Training data:** How is training attendance tracked? Spreadsheet? LMS?
5. **Client reference data:** Where do MQL/SQL counts come from? WhatsApp/CRM?
6. **Data stability:** Will Excel format remain consistent month-to-month?
7. **Access control:** Do we need role-based access (admin vs. viewer), or just login/logout?
8. **Historical data:** How many months of historical data exist for backfilling?

---

## Success Criteria

**V1 Launch Success:**
- ✓ Can load January data manually (SQL scripts)
- ✓ Can calculate driver metrics from raw facts
- ✓ Can score drivers using 6 components
- ✓ Can view driver scores in browser
- ✓ Can export driver scores to Excel
- ✓ Ops team uses it for February scorecard generation

**V2 Success:**
- ✓ Upload data via UI (no SQL scripts)
- ✓ Supervisor and manager scorecards working
- ✓ 3+ months of historical data loaded
- ✓ Trend charts showing month-over-month changes
- ✓ < 5 minutes to generate all 3 scorecard levels

---

## Appendix: Sample Data Structures

### Trip Facts CSV Format
```csv
trip_id,driver_id,driver_name,vehicle_no,site,trip_date,is_first_point_late,has_speed_violation,dry_run_km
672416,NVS 3666,Abhishek,KA51AB3537,Axon Interconnectors,2025-12-01,false,true,5.2
672417,NVS 3094,Santhosh N,KA51AK4011,Axon Interconnectors,2025-12-01,false,false,3.1
```

### Spare Usage CSV Format
```csv
driver_id,usage_date,spare_driver_name
NVS 3255,2025-12-12,Kumar
NVS 1463,2025-12-13,Manikandan
```

### Fuel Facts CSV Format
```csv
vehicle_no,driver_id,total_km,diesel_liters,expected_mileage,actual_mileage
KA01AB0173,NVS 1665,1303,207.08,6.5,6.29
KA01AB0177,NVS 1740,621,123.88,6.5,5.01
```

### Hierarchy Mapping CSV Format
```csv
site,supervisor,manager
Axon Interconnectors,Ravi Kumar,Shashikumar M
BVM Global School,Srinivas R V,Nagendra G
```

---

**Version:** 1.0  
**Last Updated:** February 4, 2026  
**Author:** Ops Scorecard Team
