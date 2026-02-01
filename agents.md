# Ops Scorecard — Agent Guide

## Stack
- Next.js (App Router) on Vercel
- Supabase (Auth + Postgres + Storage)

## Core Principle
This system uses a modular pipeline:
Ingest → Normalize (Canonical Tables) → Score Components → Store Facts/Scores → Export + Trends

## Development Rules
1. Implement ONE component or milestone at a time.
2. Before coding a scoring component, ask the user:
   - Required input fields/columns
   - Validation rules
   - Aggregation logic
   - Scoring thresholds/weights/overrides
   - Output fields to persist for trends
3. Never mix ingestion logic with scoring logic.
4. All month-based work must attach to a `month_run`.

## Data Rules
- Store raw uploads and exports in Supabase Storage (private).
- Store canonical monthly facts in Postgres.
- All scoring must run only on canonical tables (not raw files).

## Milestone Order
1. Auth + Rulesets + Month Runs
2. Canonical Ingestion (Data + Mapping adapters)
3. Driver Score Components (one by one)
4. Supervisor Aggregation
5. Manager Aggregation
6. Trends UI + Excel Export

## UX Rules
- App must be login-protected (email+password).
- Show validation errors in human-readable form.
- Show preview tables before scoring/export.

## Stop Condition
After finishing a milestone or component, STOP and ask:
“Which component should we implement next?”
