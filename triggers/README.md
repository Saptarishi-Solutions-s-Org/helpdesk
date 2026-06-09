# Helpdesk Supabase SQL

Run these after `npm run db:migrate` in the Supabase SQL editor:

1. `updated_at_function.sql`
2. `updated_at_triggers.sql`
3. `realtime_publication.sql`

The app uses the same client-side realtime pattern as HRMS. These SQL files make
the changed helpdesk tables available to Supabase Realtime and keep `updated_at`
columns consistent.
