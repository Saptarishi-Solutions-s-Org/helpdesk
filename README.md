# SRS Helpdesk

SRS Helpdesk is a Next.js support application for Saptarishi-style client support workflows. It uses the same ESS/HRMS visual language: sidebar shell, compact dashboard pages, shadcn-based controls, Poppins-style product UI, confirmation dialogs, realtime notifications, and audit-first issue handling.

The application is designed around two roles:

- `ADMIN`: SRS/internal support user. Admins can see all organizations, configure support routing, triage issues, change statuses, and manage organizations/users/projects/modules.
- `USER`: Client organization user. Users can see issue activity for their own organization, raise new issues, update ticket details, add comments, reopen closed/resolved tickets, and collaborate on organization tickets.

## How The System Works

### Login And Account Flow

Users authenticate with email and password. The app stores a signed session cookie named `srs_helpdesk_session`; proxy routing protects dashboard pages and redirects logged-in users away from auth pages.

Account emails are sent only through Microsoft Graph mailer:

- Admin creates a user and the user receives a set-password link.
- User can request forgot-password email.
- User can reset password from the reset-password link.

Issue updates do not send emails. They create in-app notifications only.

### Organizations

An organization represents a client company using SRS support.

- Organization codes are generated as `SHDORG001`, `SHDORG002`, etc.
- New organizations are active by default.
- Organization detail pages use the organization code in the URL.
- Inactive organizations cascade users to inactive when the organization is disabled.
- Empty optional values are shown as `Not provided`.

### Users

Users belong to an organization and role.

- Admin-created organization users are created as `USER` by default.
- Users are managed from the organization detail flow, not from a separate sidebar page.
- Users in an inactive organization cannot be treated as active support users.

### Projects And Modules

Projects and modules are configured routing values. They are not free-text fields during triage.

- Projects have generated codes like `SRSHD001`.
- Modules have generated codes like `SRSHDM001`.
- Modules belong to projects.
- Delete actions check associations before deleting.
- Admin uses Projects and Modules to decide where an issue belongs.

### Issues

Users raise issues from the Issues page. At creation time, the user only provides:

- Title
- Rich description
- Optional attachment link and label

The user does not decide issue type or priority. Admin decides those during triage.

Issue ticket numbers are generated server-side with a future-proof sequence:

```text
SRS-HD-000001
SRS-HD-000002
SRS-HD-999999
SRS-HD-1000000
SRS-HD-1000001
```

The six digits are minimum padding, not a maximum limit.

### User Issue Scope

For users, both Overview and Issues are organization-scoped.

- User Overview shows stats for all issues raised by the user's organization.
- User Issues page shows all issues raised by the user's organization.
- Users can open, comment, update details, add/remove ticket attachments, and reopen tickets from their organization.
- Comment deletion is self-only: a user can delete only their own comment.

### Admin Issue Scope

Admins see all organizations and all tickets.

Admins can:

- View all organization tickets.
- Assign project/module.
- Decide issue type: `BUG` or `CR`.
- Decide priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Change status.
- Comment.
- View complete activity and status history.

Admins do not use the user ticket-detail edit flow for changing user descriptions.

### Issue Statuses

Supported statuses:

```text
OPEN
TRIAGED
IN_PROGRESS
WAITING_FOR_USER
RESOLVED
CLOSED
REOPENED
CANCELLED
```

The UI formats enum values into readable labels, for example `WAITING_FOR_USER` becomes `Waiting For User`.

### Comments, History, And Attachments

Issue detail pages are built like a support/Jira-style ticket view.

- Description and comments use rich text.
- Comments support rich text and an optional attachment link.
- Attachments are stored as links, not uploaded files.
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
- `/dashboard/issues` - Organization issues for users; all issues for admins.
- `/dashboard/issues/[ticketNo]` - Issue detail by ticket number.
- `/dashboard/profile` - Profile and password settings.

### Admin

- `/dashboard/admin/organizations` - Organization cards.
- `/dashboard/admin/organizations/[code]` - Organization detail by organization code.
- `/dashboard/admin/organizations/[code]/users` - Organization user management.
- `/dashboard/admin/projects` - Project configuration.
- `/dashboard/admin/modules` - Module configuration.
- `/dashboard/admin/roles` - Role reference page.

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
- `/api/admin/users`
- `/api/admin/roles`
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
- Modules belong to projects.
- Issues belong to organizations and reporters.
- Issues may be assigned to project/module after Admin triage.
- Comments, attachments, status history, activity, and notifications are linked to issues.

## Environment Variables

Create `.env` from `.env.example`.

```env
NEXT_PUBLIC_APP_NAME="SRS Helpdesk"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_ENV="local"
EMAIL_ASSET_BASE_URL="http://localhost:3000"
AUTH_SECRET=""

DATABASE_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

TENANT_ID=""
CLIENT_ID=""
CLIENT_SECRET=""
MICROSOFT_GRAPH_SENDER=""
```

Notes:

- `DATABASE_URL` points to Supabase Postgres.
- Supabase URL and anon key are used by the realtime client.
- Microsoft Graph credentials are used only for account emails.
- `AUTH_SECRET` signs the app session cookie.
- `NEXT_PUBLIC_APP_URL` is used to build set-password and reset-password links.

## Realtime Setup

Supabase Realtime should be enabled for tables that drive live UI updates:

- `notifications`
- `issues`
- `issue_comments`
- `issue_attachments`
- `issue_status_history`
- `issue_activity`
- `users`

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

Verification:

```bash
npm run lint
npm run typecheck
npm run build
```

## Production Behavior Checklist

- Admin can create organizations.
- Organization detail opens by organization code.
- Admin can create organization users.
- Invite and password reset emails use Microsoft Graph.
- Users can log in and see organization-wide overview and issue lists.
- Users can raise tickets with rich text and optional link attachments.
- Admin can triage type, priority, project, and module.
- Admin can change status.
- Users can comment and update organization tickets.
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
