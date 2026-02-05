# Ops Scorecard — Agent Guide (Updated)

## Stack
- Next.js (App Router) on Vercel
- Supabase (Auth + Postgres + Storage)

## Core Principle
This system uses a **3-layer modular pipeline**:

```
RAW DATA → PREPROCESSING → CANONICAL FACTS → CALCULATION → METRICS → SCORING → SCORES → AGGREGATION → EXPORT
```

**Critical separation:**
1. **Preprocessing** (TEMPORARY) - Parse Roorides Excel exports → Will be replaced by API
2. **Calculation** (PERMANENT) - Calculate metrics from canonical facts → Business logic
3. **Scoring** (PERMANENT) - Apply rules to metrics → Rules engine

## Architecture Layers

### Layer 1: Raw Data Storage (Temporary)
- **Purpose:** Store raw trip-level, spare-level, fuel-level data from Roorides
- **Tables:** `trip_facts`, `spare_usage_facts`, `fuel_facts`, `hierarchy_mapping`
- **Populated by:** Excel parser (V1) OR API adapter (V2)
- **Lifespan:** These tables exist forever, but HOW they're populated changes

### Layer 2: Calculated Metrics (Permanent)
- **Purpose:** Aggregate and calculate metrics from raw facts
- **Tables:** `driver_metrics`, `supervisor_metrics`, `manager_metrics`
- **Logic:** FPD %, spare count, mileage variance, etc.
- **Note:** This is pure calculation, NO scoring yet

### Layer 3: Scored Results (Permanent)
- **Purpose:** Apply scoring rules to metrics
- **Tables:** `driver_scores`, `supervisor_scores`, `manager_scores`
- **Logic:** Component registry, thresholds, weights, overrides

## Development Rules

### Rule 1: One Layer at a Time
Do NOT jump between layers. Complete Layer 1 before starting Layer 2.

### Rule 1.5: Git Workflow
- When the user says "push to git", it means: review local changes, propose a commit message, commit, then push to the default remote/branch unless otherwise specified.
- If the user provides a commit message, use it as-is.

### Rule 1.6: Edge Function Deployment
- When new Supabase Edge Functions are created or updated, deploy them via CLI without asking each time.

### Rule 2: Script-Based Table Creation
When the user provides data (e.g., "Jan data"), follow this flow:
1. User uploads/provides raw data
2. Agent creates SQL script to load data into appropriate raw tables
3. User reviews script
4. Agent executes script to populate tables
5. Agent shows sample rows to confirm

### Rule 3: Calculation Before Scoring
NEVER calculate scores directly from raw data. Always:
1. Raw facts → Calculated metrics (Layer 2)
2. Calculated metrics → Scores (Layer 3)

### Rule 4: Ask Before Implementing Components
Before coding ANY component (calculation or scoring), ask:
- **For calculation components:**
  - What raw fact tables are needed?
  - What aggregation logic (group by? sum? count? average?)
  - What edge cases (nulls, zeros, missing drivers)?
  - What output fields to store in metrics table?

- **For scoring components:**
  - What metric fields are needed as input?
  - What are the thresholds/bands?
  - What are the point values?
  - Are there overrides (e.g., zero-tolerance)?
  - What config should be snapshotted?

### Rule 5: Month Run Scope
All operations must be scoped to a `month_run`. Every table must have:
```sql
month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE
```

## Data Flow (Detailed)

### Step 1: Preprocessing (User Provides → Agent Loads)
**User action:** "Load January data into trip_facts table"
**Agent action:**
1. Create SQL script to parse user's data format
2. Show script for review
3. Execute to populate `trip_facts`, `spare_usage_facts`, etc.
4. Confirm row counts

**Example:**
```sql
-- Agent generates this script based on user's data format
INSERT INTO trip_facts (month_run_id, trip_id, driver_id, ...)
VALUES
  ('...', '672416', 'NVS 3666', ...),
  ('...', '672417', 'NVS 3094', ...);
```

### Step 2: Calculation (Derived from Facts)
**User action:** "Calculate FPD metrics"
**Agent action:**
1. Query `trip_facts` for the month_run
2. Aggregate: GROUP BY driver_id, COUNT(*), SUM(CASE WHEN is_late...)
3. Store results in `driver_metrics`

**Example:**
```sql
INSERT INTO driver_metrics (month_run_id, driver_id, fpd_total_trips, fpd_late_trips, fpd_pct)
SELECT 
  month_run_id,
  driver_id,
  COUNT(*) as total_trips,
  COUNT(*) FILTER (WHERE is_first_point_late) as late_trips,
  (COUNT(*) FILTER (WHERE is_first_point_late)::numeric / COUNT(*) * 100) as fpd_pct
FROM trip_facts
WHERE month_run_id = '...'
GROUP BY month_run_id, driver_id;
```

### Step 3: Scoring (Rules Applied to Metrics)
**User action:** "Score FPD component"
**Agent action:**
1. Query `driver_metrics.fpd_pct`
2. Apply rules: < 9% → 20, 10-15% → 10, > 16% → 0
3. Store in `driver_scores.fpd_score`

**Example:**
```sql
UPDATE driver_scores
SET fpd_score = CASE
  WHEN m.fpd_pct < 9 THEN 20
  WHEN m.fpd_pct <= 15 THEN 10
  ELSE 0
END
FROM driver_metrics m
WHERE driver_scores.driver_id = m.driver_id
  AND driver_scores.month_run_id = m.month_run_id
  AND m.month_run_id = '...';
```

## Database Schema Layers

### Core Tables (Always Present)
```sql
CREATE TABLE month_runs (
  id uuid PRIMARY KEY,
  month date NOT NULL,
  status text, -- 'raw_loaded', 'metrics_calculated', 'scores_calculated'
  created_at timestamptz DEFAULT now()
);
```

### Layer 1: Raw Facts (From Preprocessing)
```sql
CREATE TABLE trip_facts (
  id uuid PRIMARY KEY,
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,
  trip_id text,
  driver_id text,
  vehicle_no text,
  site text,
  trip_date date,
  is_first_point_late boolean,
  has_speed_violation boolean,
  dry_run_km numeric
);

CREATE TABLE spare_usage_facts (
  id uuid PRIMARY KEY,
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,
  driver_id text,
  usage_date date,
  spare_driver_name text
);

CREATE TABLE fuel_facts (
  id uuid PRIMARY KEY,
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,
  vehicle_no text,
  driver_id text,
  total_km numeric,
  diesel_liters numeric,
  expected_mileage numeric,
  actual_mileage numeric
);

CREATE TABLE hierarchy_mapping (
  id uuid PRIMARY KEY,
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,
  site text,
  supervisor text,
  manager text
);
```

### Layer 2: Calculated Metrics (Derived)
```sql
CREATE TABLE driver_metrics (
  id uuid PRIMARY KEY,
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  driver_name text,
  site text,
  supervisor text,
  manager text,
  
  -- FPD metrics
  fpd_total_trips int,
  fpd_late_trips int,
  fpd_pct numeric,
  
  -- Spare metrics
  spare_usage_count int,
  
  -- Speed metrics
  speed_violation_count int,
  
  -- Mileage metrics
  expected_mileage_km numeric,
  actual_mileage_km numeric,
  mileage_variance_pct numeric,
  
  -- Incident metrics (from separate source)
  incident_count int,
  has_zero_tolerance_incident boolean,
  
  -- Exterior metrics (from separate source)
  exterior_issue_count int,
  
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(month_run_id, driver_id)
);
```

### Layer 3: Scores (Rules Applied)
```sql
CREATE TABLE driver_scores (
  id uuid PRIMARY KEY,
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  
  -- Component scores
  fpd_score numeric,
  spare_score numeric,
  speed_score numeric,
  incident_score numeric,
  mileage_score numeric,
  exterior_score numeric,
  
  -- Total
  total_score numeric,
  max_possible_score numeric DEFAULT 100,
  
  -- Config snapshot
  scoring_config jsonb,
  
  scored_at timestamptz DEFAULT now(),
  UNIQUE(month_run_id, driver_id)
);
```

## Milestone Order (Updated)

### Phase 1: Foundation (Week 1)
1. Supabase setup (auth, database)
2. Create `month_runs` table
3. Create Layer 1 raw fact tables
4. Simple UI to create month_run records

### Phase 2: Raw Data Loading (Week 2)
**User provides January data**
5. Agent creates SQL script to load trip_facts
6. Agent creates SQL script to load spare_usage_facts
7. Agent creates SQL script to load fuel_facts
8. Agent creates SQL script to load hierarchy_mapping
9. Confirm all data loaded correctly

### Phase 3: Metrics Calculation (Week 3-4)
10. Create `driver_metrics` table
11. Implement FPD calculation (trip aggregation)
12. Implement spare usage calculation (count)
13. Implement speed violation calculation (count)
14. Implement mileage variance calculation (fuel logs)
15. Show preview of calculated metrics

### Phase 4: Scoring Engine (Week 5-6)
16. Create `driver_scores` table
17. Implement FPD scoring component
18. Implement spare scoring component
19. Implement speed scoring component
20. Implement mileage scoring component
21. Implement incident scoring component (pre-scored import for now)
22. Implement exterior scoring component (pre-scored import for now)
23. Implement scoring orchestrator (sum components, apply overrides)

### Phase 5: Export (Week 7)
24. Generate Excel export with driver scores
25. Include breakdown sheet (component-level)

### Phase 6: Supervisor & Manager (Week 8-10)
26. Create `supervisor_metrics` table
27. Implement supervisor calculation (aggregate driver metrics + new metrics)
28. Create `supervisor_scores` table
29. Implement supervisor scoring components
30. Repeat for manager level

### Phase 7: Trends (Week 11-12)
31. Build trend queries (month-over-month)
32. Build trend UI

## Validation Rules

### Raw Data Validation (Layer 1)
- Driver IDs are normalized (consistent format)
- No duplicate trip IDs per month
- Dates are within month range
- Numeric fields are valid numbers

### Metrics Validation (Layer 2)
- Percentages are 0-100
- Counts are >= 0
- Every driver in metrics has raw facts
- No orphaned drivers (missing from hierarchy)

### Scoring Validation (Layer 3)
- Component scores <= max_score
- Total score <= max_possible_score
- Config snapshot is present
- All required components have scores

## Stop Conditions

After completing ANY step, STOP and ask:
- "Data loaded successfully. Should I proceed to calculate metrics, or would you like to review the data first?"
- "Metrics calculated. Should I proceed to scoring, or would you like to verify the calculations?"
- "Component X scored. Should I implement component Y, or would you like to test this component first?"

## Never Assume

- Don't assume data format (ask user to confirm)
- Don't assume thresholds (ask for scoring rules)
- Don't assume aggregation logic (ask how to group/sum)
- Don't assume what comes next (ask user's preference)

## Code Organization

```
src/
├── db/
│   ├── schema.sql              # All table definitions
│   ├── seed-january.sql        # Script to load Jan data (generated per user's format)
│   └── migrations/             # Schema changes over time
│
├── calculators/                # Layer 2: Metrics calculation
│   ├── fpd-calculator.ts
│   ├── spare-calculator.ts
│   └── mileage-calculator.ts
│
├── scoring/                    # Layer 3: Scoring engine
│   ├── components/
│   │   ├── fpd-component.ts
│   │   └── spare-component.ts
│   ├── registry.ts
│   └── orchestrator.ts
│
└── app/                        # Next.js UI
    ├── upload/                 # (Later: when API ready)
    ├── metrics/                # Show calculated metrics
    ├── scores/                 # Show scores
    └── export/                 # Excel download
```

## Key Principles

1. **Separation of Concerns:** Raw data ≠ Metrics ≠ Scores
2. **Script-Based Loading:** User provides data → Agent writes SQL → User approves → Execute
3. **One Step at a Time:** Load → Calculate → Score → Export (never skip)
4. **Ask, Don't Assume:** Before implementing, confirm logic with user
5. **Scoped to Month:** Everything tied to `month_run_id`

## Example Interaction Flow

**User:** "Load January trip data"
**Agent:** 
1. "Please share the January trip data format (CSV/JSON/Excel sample)"
2. User shares data
3. "I'll create a SQL script to load this into trip_facts. Here's the script: [shows SQL]"
4. User approves
5. "Executing... Loaded 15,234 trips for January. Proceed to calculate metrics?"

**User:** "Yes, calculate FPD metrics"
**Agent:**
1. "Calculating FPD metrics from trip_facts..."
2. Shows SQL query being executed
3. "Calculated FPD for 234 drivers. Sample: Driver NVS 3666 has 8.5% FPD (2 late / 23 total trips). Proceed to scoring?"

**User:** "Yes, score FPD component"
**Agent:**
1. "What are the FPD scoring thresholds? (e.g., <9% = 20 pts, 10-15% = 10 pts, >16% = 0 pts)"
2. User confirms thresholds
3. "Applying FPD scoring rules..."
4. Shows SQL UPDATE statement
5. "Scored FPD for 234 drivers. Sample: Driver NVS 3666 scored 10/20 points. Proceed to next component (spare usage)?"

---

This ensures the agent always knows:
- Where we are in the pipeline (raw → metrics → scores)
- What to ask before implementing
- When to stop and wait for user confirmation
