---
name: safe-deletions
description: "Back up data to a local file before permanently deleting it, then tell the user where the backup is. Use this skill before writing or running anything that permanently removes data from the database or file system, such as Prisma delete or deleteMany, raw SQL DELETE, DROP or TRUNCATE, rm on uploads or other data files, de-duplication and cleanup scripts, or migrations that drop tables or columns. Use it even when the user only says to clean up, remove duplicates, wipe, purge or reset records, and even for one-off scripts. Does not apply to adding delete endpoints or buttons to the app, or to removing source code tracked in git."
---

# Safe Deletions

This database holds real people's records, including staff and student data. PostgreSQL has no undo, so a local backup may be the only way to recover from a wrong filter or a misunderstood request.

## Workflow

Complete these steps in order. Don't delete anything until the backup is verified.

### 1. Confirm the target

- Check which database the script will connect to. Look at the host in `DATABASE_URL` without printing the password, and tell the user if it is production.
- Run the delete's filter as a read-only query first, and report the row count and a few sample rows. If the count is higher than the request implies, stop and ask.

### 2. Find everything the delete will remove

Check `server/prisma/schema.prisma` for relations with `onDelete: Cascade`. Those child rows are deleted too, so they need to be in the backup. A backup of only the parent rows can't fully restore the data.

Also note any `SetNull` relations, since those rows lose their link. Record the affected row IDs so the link can be restored.

### 3. Write the backup

Save it to `server/backups/` as `deleted_<what>_<ISO-timestamp>.json`, for example `deleted_duplicate_enrollments_2026-10-30T10-15-49-251Z.json`. Replace `:` and `.` in the timestamp with `-`.

```ts
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../lib/prisma.js'; // adjust the path to the script's location

const where = { /* the exact filter used for the delete */ };
const rows = await prisma.enrollment.findMany({
  where,
  include: { /* cascade-deleted relations from step 2 */ },
});

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.resolve('backups', `deleted_duplicate_enrollments_${stamp}.json`); // run from server/
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(
  file,
  // JSON.stringify throws on BigInt, so convert those values to strings
  JSON.stringify({ where, count: rows.length, rows }, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v, 2),
);
```

Run TypeScript scripts from `server/` with `npx tsx <script>`.

For **files** (`rm`), copy them to `server/backups/deleted_<what>_<timestamp>/` with their relative paths preserved, then compare the file counts.

For a **dropped table or column**, including in a Prisma migration, dump the affected data before applying the migration, using the same JSON format or `pg_dump --table`.

If the data is too large to back up locally, or there isn't enough disk space, stop and ask the user. Don't skip the backup or reduce it to a sample.

### 4. Verify the backup

Read the file back, parse it, and confirm its row count matches the count from step 1. Use the same `where` for the backup and the delete, and run the delete only by those backed-up IDs when practical, so rows added in between aren't removed without a backup.

### 5. Delete, then report

After deleting, compare the number of rows deleted with the number backed up, then tell the user:

- the full backup path
- how many rows or files were backed up and deleted, including cascaded rows
- how to restore, such as a `createMany` from the JSON with parents inserted before children

## Keep backups out of git

Backups contain personal data, so they shouldn't be committed. Never stage files from `server/backups/`, and if `git status` shows new files there, mention it to the user.

## If the user asks to skip the backup

Explain what can't be recovered without it, in a sentence or two. If they still want to skip it, follow their decision and state in your report that no backup was taken.
