# SRS Helpdesk

SRS Helpdesk is a Next.js support application for Saptarishi-style client support workflows. It uses the same ESS/HRMS visual language: sidebar shell, compact dashboard pages, shadcn-based controls, Poppins-style product UI, confirmation dialogs, realtime notifications, and audit-first issue handling.

The application is designed around client support and internal support roles:

- `ADMIN`: SRS/internal support user. Admins can see all organizations, configure support routing, create tickets on behalf of clients, triage issues, change statuses, and manage organizations/users/projects/modules.
- `CLIENT`: Client organization user. Clients can see issue activity for their own organization, raise new issues, update ticket details, add comments, reopen closed/resolved tickets, and collaborate on organization tickets.
- `DEVELOPER` and `QUALITY ANALYST`: internal team users. These roles are currently read-only in the issue flow; deeper internal assignment/clone workflows are future work.

## How The System Works

### Login And Account Flow

Clients authenticate with email and password. The app stores a signed session cookie named `srs_helpdesk_session`; proxy routing protects dashboard pages and redirects logged-in users away from auth pages.

Account emails are sent only through Microsoft Graph mailer:

- Admin creates a client and the client receives a set-password link.
- Client can request forgot-password email.
- Client can reset password from the reset-password link.

Issue updates do not send emails. They create in-app notifications only.

### Organizations

An organization represents a client company using SRS support.

- Organization codes are generated as `SHDORG001`, `SHDORG002`, etc.
- Organizations also have a required 2-3 character `shortCode` used in ticket numbers.
- Organization detail pages can link one or more active projects to the organization.
- New organizations are active by default.
- Organization detail pages use the organization code in the URL.
- Inactive organizations cascade users to inactive when the organization is disabled.
- Empty optional values are shown as `Not provided`.

### Clients

Clients belong to an organization and role.

- Admin-created organization clients are created as `CLIENT` by default.
- Clients are managed from the organization detail flow, not from a separate sidebar page.
- Clients in an inactive organization cannot be treated as active support users.

### Projects And Modules

Projects and modules are configured routing values. They are not free-text fields during triage.

- Projects have generated codes like `SRSHD001`.
- Projects also have a required 2-3 character `shortCode` for compact project identity and future internal workflows.
- Projects must be linked to organizations before client tickets can be created or triaged against them.
- Modules have generated codes like `SRSHDM001`.
- Modules belong to projects.
- Delete actions check associations before deleting.
- Admin uses Projects and Modules to decide where an issue belongs.

### Issues

Clients raise issues from the Issues page. Admins can also create issues on behalf of a client by selecting an organization first, then the reporting client. At creation time, the issue creator provides:

- Title
- Rich description
- Optional attachment links and labels

The client does not decide issue type or priority. Admin decides those during triage.

Issue ticket numbers are generated server-side from the organization short code:

```text
SHD-ORG-1
SHD-ORG-2
SHD-ORG-1000000
```

The numeric suffix is not padded and has no fixed upper limit. Sequences are scoped per organization. If an organization has exactly one linked active project, the issue is assigned to that project immediately. If an organization has multiple linked projects, Admin assigns the project during triage while the ticket number remains unchanged. If no project is linked, issue creation is blocked with a contact-admin message.

### Client Issue Scope

For clients, both Overview and Issues are organization-scoped.

- Client Overview shows stats for all issues raised by the user's organization.
- Client Issues page shows all issues raised by the user's organization.
- Clients can open, comment, update details, add/remove ticket attachments, and reopen tickets from their organization.
- Comment deletion is self-only: a client can delete only their own comment.

### Admin Issue Scope

Admins see all organizations and all tickets.

Admins can:

- View all organization tickets.
- Assign project/module.
- Decide issue type: `BUG`, `CR`, `ISSUE`, or `SERVICE_REQUEST`.
- Decide priority: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, or `BLOCKER`.
- Change status.
- Comment.
- View complete activity and status history.

Admins can edit ticket details and attachments when needed, but project/module/type/priority changes remain in the assignment section so history stays clear.

### Issue Statuses

Supported statuses:

```text
WAITING_FOR_SUPPORT
BACKLOG
IN_ANALYSIS
IN_PROGRESS
WAITING_FROM_CLIENT
QUEUED_FOR_RELEASE
RESOLVED
CLOSED
REOPENED
CANCELLED
```

Legacy values still load for old records:

```text
OPEN
TRIAGED
```

The UI formats enum values into readable labels, for example `WAITING_FROM_CLIENT` becomes `Waiting From Client`.

### Comments, History, And Attachments

Issue detail pages are built like a support/Jira-style ticket view.

- Description and comments use rich text.
- Comments support rich text and an optional attachment link.
- Attachments are stored as links, not uploaded files.
- Raise Issue and Edit Issue support multiple ticket-level attachment links.
- Attachment links can point to Jam, Lightshot, Drive, or any team-accessible URL.
- Ticket-level attachments can be added and removed from the edit dialog.
- Comment attachments stay with the comment.
- History shows status movement and activity entries.
- Activity tracks from/to values for edited ticket fields, attachment changes, comment deletion, and lifecycle movement.

### Notifications And Realtime

The app uses a `notifications` table plus Supabase Realtime.

Notifications are created for:

- Issue created
- Project/module assigned
- Comment added
- Status changed
- Issue closed
- Issue reopened
- Issue updated
- Comment deleted
- Attachment removed

Notifications appear in the dashboard header menu and show realtime toasts for the current recipient.

## Pages

### Public

- `/` - Public landing/login entry page.
- `/login` - Login page.
- `/forgot-password` - Forgot password.
- `/reset-password` - Reset password by token.
- `/set-password` - Set password by invite token.
- `/not-authorized` - Access denied page.
- Global `not-found` page.

### Dashboard

- `/dashboard` - Overview summary.
- `/dashboard/issues` - Organization issues for clients; all issues for admins.
- `/dashboard/issues/[ticketNo]` - Issue detail by ticket number.
- `/dashboard/profile` - Profile and password settings.

### Admin

- `/dashboard/admin/organizations` - Organization cards.
- `/dashboard/admin/organizations/[code]` - Organization detail by organization code.
- `/dashboard/admin/organizations/[code]/users` - Organization client management.
- `/dashboard/admin/projects` - Project configuration.
- `/dashboard/admin/modules` - Module configuration.
- `/dashboard/admin/roles` - Role reference page.
- `/dashboard/admin/internal-team` - Internal team user management for `DEVELOPER` and `QUALITY ANALYST`.

## API Surface

### Auth And Profile

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/set-password`
- `GET /api/profile`
- `PATCH /api/profile`
- `POST /api/profile/change-password`

### Admin

- `/api/admin/organizations`
- `/api/admin/organizations/[id]`
- `/api/admin/organizations/[id]/projects`
- `/api/admin/organizations/[id]/projects/[projectId]`
- `/api/admin/users`
- `/api/admin/roles`
- `/api/admin/internal-users`
- `/api/admin/projects`
- `/api/admin/projects/[id]`
- `/api/admin/modules`
- `/api/admin/modules/[id]`

### Issues

- `GET /api/issues`
- `POST /api/issues`
- `GET /api/issues/[id]`
- `PATCH /api/issues/[id]`
- `POST /api/issues/[id]/assign`
- `POST /api/issues/[id]/status`
- `POST /api/issues/[id]/reopen`
- `POST /api/issues/[id]/comments`
- `DELETE /api/issues/[id]/comments/[commentId]`
- `POST /api/issues/[id]/attachments`
- `DELETE /api/issues/[id]/attachments/[attachmentId]`

`[id]` can be a UUID or ticket number where the route supports ticket lookup.

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/[id]/read`
- `PATCH /api/notifications/read-all`

## Database Model

The database is Postgres via Supabase, accessed through Drizzle ORM.

Core tables:

- `organizations`
- `roles`
- `users`
- `set_password_tokens`
- `password_reset_tokens`
- `projects`
- `organization_projects`
- `ticket_sequences`
- `modules`
- `issues`
- `issue_attachments`
- `issue_comments`
- `issue_status_history`
- `issue_activity`
- `notifications`

Important relations:

- Users belong to roles.
- Client users belong to organizations.
- Organizations link to one or more projects through `organization_projects`.
- Ticket numbering state is stored in `ticket_sequences`.
- Modules belong to projects.
- Issues belong to organizations and reporters.
- Issues may be assigned to project/module after Admin triage.
- Comments, attachments, status history, activity, and notifications are linked to issues.

## Realtime Setup

Supabase Realtime should be enabled for tables that drive live UI updates:

- `notifications`
- `issues`
- `issue_comments`
- `issue_attachments`
- `issue_status_history`
- `issue_activity`
- `users`
- `organizations`
- `projects`
- `organization_projects`

The UI also uses SWR refresh intervals as a backup.

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Generate Drizzle migrations after schema changes:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

After the status workflow update, apply the generated migration before running issue pages against an existing database; otherwise Postgres will reject new enum values such as `WAITING_FOR_SUPPORT`.

Verification:

```bash
npm run lint
npm run typecheck
npm run build
```

## Production Behavior Checklist

- Admin can create organizations.
- Organization detail opens by organization code.
- Admin can create organization clients.
- Admin can create internal team users as `DEVELOPER` or `QUALITY ANALYST`.
- Admin can link projects to organizations.
- Invite and password reset emails use Microsoft Graph.
- Clients can log in and see organization-wide overview and issue lists.
- Clients can raise tickets with rich text and multiple optional link attachments.
- Admin can raise tickets on behalf of selected active clients.
- Admin can triage type, priority, project, and module.
- Admin can change status.
- Clients can comment and update organization tickets.
- Closed/resolved tickets can be reopened.
- Comment deletion is self-only.
- Ticket edits, comments, deletes, attachment changes, reopen, and status changes are tracked.
- Notifications appear in the header and update through Supabase Realtime.
- No Cloudinary upload flow is used; attachments are external links only.

## Current Design Rules

- Keep UI aligned with ESS/HRMS theme.
- Prefer shadcn controls, Lucide icons, compact tables/cards, and HRMS-style confirmation/error dialogs.
- Do not introduce free-text project/module routing.
- Do not send lifecycle emails for issue activity.
- Use global loaders instead of ad hoc loading blocks.
- Keep enum values human-readable in UI and notifications.
