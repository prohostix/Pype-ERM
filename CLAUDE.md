# Pype ERM

## Long lists must be paginated on the server

Applies to every list or table that can grow over time (logs, students, users, payments, invoices, attendance, leads, notifications, reports).

- Load only the page being shown. Fetch another page when the user moves to it. Never load every row and slice it in the browser.
- API: accept `page` and `limit` (default 10, maximum 100), use `skip`/`take` with a stable `orderBy`, and return `total` with the rows.
- Search, filters, sorting and counts run on the server, so they cover all rows. Go back to page 1 when they change.
- Select only the fields the screen shows.
- UI: use `ListPagination` from `client/src/components/ui/list-pagination.tsx`. Debounce search input and ignore responses from older requests.
- Exports use their own request; they do not rely on the rows loaded on screen.

Reference: `getActivityLogs` in `server/src/controllers/ceoController.ts` and `client/src/components/panels/ActivityLogPanel.tsx`.
