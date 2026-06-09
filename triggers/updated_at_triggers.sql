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
