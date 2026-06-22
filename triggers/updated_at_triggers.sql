drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_organization_projects_updated_at on public.organization_projects;
create trigger set_organization_projects_updated_at
before update on public.organization_projects
for each row execute function public.set_updated_at();

drop trigger if exists set_ticket_sequences_updated_at on public.ticket_sequences;
create trigger set_ticket_sequences_updated_at
before update on public.ticket_sequences
for each row execute function public.set_updated_at();

drop trigger if exists set_modules_updated_at on public.modules;
create trigger set_modules_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

drop trigger if exists set_issues_updated_at on public.issues;
create trigger set_issues_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

drop trigger if exists set_issue_comments_updated_at on public.issue_comments;
create trigger set_issue_comments_updated_at
before update on public.issue_comments
for each row execute function public.set_updated_at();

drop trigger if exists set_internal_tickets_updated_at on public.internal_tickets;
create trigger set_internal_tickets_updated_at
before update on public.internal_tickets
for each row execute function public.set_updated_at();

drop trigger if exists set_internal_ticket_comments_updated_at on public.internal_ticket_comments;
create trigger set_internal_ticket_comments_updated_at
before update on public.internal_ticket_comments
for each row execute function public.set_updated_at();

drop trigger if exists set_internal_ticket_worklogs_updated_at on public.internal_ticket_worklogs;
create trigger set_internal_ticket_worklogs_updated_at
before update on public.internal_ticket_worklogs
for each row execute function public.set_updated_at();

drop trigger if exists set_core_tickets_updated_at on public.core_tickets;
create trigger set_core_tickets_updated_at
before update on public.core_tickets
for each row execute function public.set_updated_at();

drop trigger if exists set_core_ticket_comments_updated_at on public.core_ticket_comments;
create trigger set_core_ticket_comments_updated_at
before update on public.core_ticket_comments
for each row execute function public.set_updated_at();

drop trigger if exists set_core_ticket_worklogs_updated_at on public.core_ticket_worklogs;
create trigger set_core_ticket_worklogs_updated_at
before update on public.core_ticket_worklogs
for each row execute function public.set_updated_at();

drop trigger if exists set_core_ticket_attachments_updated_at on public.core_ticket_attachments;
create trigger set_core_ticket_attachments_updated_at
before update on public.core_ticket_attachments
for each row execute function public.set_updated_at();
