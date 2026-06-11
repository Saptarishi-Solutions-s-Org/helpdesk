do $$
declare
  realtime_table text;
  realtime_tables text[] := array[
    'roles',
    'organizations',
    'users',
    'projects',
    'modules',
    'organization_projects',
    'issues',
    'issue_comments',
    'issue_attachments',
    'issue_status_history',
    'issue_activity',
    'notifications',
    'internal_tickets',
    'internal_ticket_comments',
    'internal_ticket_status_history',
    'internal_ticket_activity',
    'internal_ticket_worklogs'
  ];
begin
  foreach realtime_table in array realtime_tables loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end $$;
