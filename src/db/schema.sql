CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS month_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  status text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (month)
);

CREATE TABLE IF NOT EXISTS operation_summary_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  trip_id text NOT NULL,
  corp_name text,
  trip_date date,
  trip_type text,
  trip_time text,
  route_no text,
  route_name text,
  vehicle_no text,
  driver_name text,
  driver_designation text,
  attender_name text,
  attender_designation text,
  source_name text,
  scheduled_start_end_time text,
  actual_start_time text,
  source_lateness text,
  corp_entry_exit text,
  lateness text,
  late_by text,
  late_due_to text,
  first_point_visit text,
  schedule_time_first_point text,
  actual_time_first_point text,
  vehicle_capacity numeric,
  expected_distance_km numeric,
  actual_distance_km numeric,
  first_last_point_visited_order numeric,
  dry_run_km numeric,
  schedule_stoppages numeric,
  skipped_stoppages numeric,
  speed_violation numeric,
  harsh_braking numeric,
  harsh_cornering numeric,
  harsh_acceleration numeric,
  destination text,
  scheduled_time_last_point text,
  actual_time_last_point text,
  last_point_lateness text,
  scheduled_commuter numeric,
  confirm_commuter numeric,
  missed_commuter numeric,
  own_transport_commuter text,
  vendor_name text,
  tracking_mode text,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, trip_id)
);

CREATE TABLE IF NOT EXISTS fpd_driver_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  driver_name text NOT NULL,
  number_of_login_trips_with_scheduled_start_time numeric,
  number_of_fps numeric,
  number_of_fpd_w_order_mismatch numeric,
  number_of_fpds numeric,
  percentage_of_fpds numeric,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, driver_name)
);

CREATE TABLE IF NOT EXISTS spare_utilization_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  corp_name text,
  request_id text,
  request_date date,
  request_time text,
  trip_type text,
  trip_id text,
  trip_name text,
  route text,
  vehicle_number text,
  scheduled_emp text,
  scheduled_employee_id text,
  actual_emp text,
  reason text,
  requested_amount numeric,
  approved_amount numeric,
  debit_amount numeric,
  pbc numeric,
  debit_from text,
  requested_by text,
  requested_on text,
  actioned_by text,
  actioned_on text,
  status text,
  comment text,

  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spare_usage_driver_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  employee_id text NOT NULL,
  driver_name text NOT NULL,
  spare_usage_count numeric,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, employee_id)
);

CREATE TABLE IF NOT EXISTS speed_violations_driver_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  driver_name text NOT NULL,
  speed_violations numeric,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, driver_name)
);

CREATE TABLE IF NOT EXISTS cleaning_driver_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  corp_name text,
  emp_id text NOT NULL,
  emp_name text,
  designation text,
  vehicle_exterior_score numeric,
  comments text,

  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incident_driver_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  corp_name text,
  emp_id text NOT NULL,
  emp_name text,
  designation text,
  driver_incident_score numeric,
  comments text,

  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diesel_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  vehicle_number text NOT NULL,
  vehicle_number_with_spaces text,
  site_name text,
  make text,
  seating_capacity text,
  wheel_base text,
  last_filing_date date,
  first_filing_km numeric,
  last_filling_km numeric,
  total_km numeric,
  diesel_in_litres numeric,
  amount numeric,
  mileage numeric,
  ideal_mileage numeric,
  difference numeric,
  diff_pct numeric,
  deductions numeric,
  accounts_remarks text,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, vehicle_number)
);

CREATE TABLE IF NOT EXISTS site_am_sup_load_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  site text NOT NULL,
  manager text,
  supervisor text,
  sup_type text,
  actual_no_of_own_vehicles numeric,
  actual_no_of_drivers numeric,
  actual_no_of_attendars numeric,
  actual_no_of_units numeric,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, site)
);

CREATE TABLE IF NOT EXISTS mileage_driver_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  vehicle_number text NOT NULL,
  ideal_mileage numeric,
  driver_name text,
  total_kms numeric,
  total_diesel numeric,
  average_mileage text,
  variation text,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, vehicle_number)
);

CREATE TABLE IF NOT EXISTS driver_scorecard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  driver_name text NOT NULL,
  site_name text,
  manager text,
  supervisor text,
  fpd_score numeric,
  spare_usage_score numeric,
  speed_violation_score numeric,
  incident_score numeric,
  mileage_score numeric,
  cleaning_score numeric,
  driver_score_total numeric,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, driver_name)
);

CREATE TABLE IF NOT EXISTS team_performance_supervisor_score_componant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_run_id uuid REFERENCES month_runs(id) ON DELETE CASCADE,

  supervisor_name text NOT NULL,
  average_driver_score numeric,

  created_at timestamptz DEFAULT now(),
  UNIQUE (month_run_id, supervisor_name)
);
