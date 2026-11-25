# Per-user permission override: plan and edge cases

Date: 2026-11-25. Status: steps 0 to 4 coded, except invoice pagination. Table created on the live database (2026-11-25); code not deployed.
After creating it, the live database matched the schema file.

Step 3 notes:
- Payments users (including Sales) get a short invoice list: number, amounts, status, student and partner name.
- Because of that, blocking View on Invoices for a Payments user hides the page's data but not the short list.
- A partner belongs to a branch when its referrer or one of its students does. This now applies to all branch users.
- Student and faculty logins are refused on all finance requests.
- Editing cannot approve an invoice without the approve action. Changing amounts of an already approved invoice is still allowed with edit.
- Step 4: Access Control page (Org Admin menu), blocked pages removed from menus, granted pages under Additional Access. Access refreshes when the user returns to the window.
The role gives each user a default. The Org Admin overrides it per user, page and action.
First case: an HR employee gets to **view** **Invoices** and **Bill & Receipts**.

## 1. Rules already decided

Where a later section says "own branch", a user without a branch gets all branches of their organization.

| Rule | Behaviour |
|---|---|
| Who assigns | Org Admin only |
| Direction | Add and remove |
| Granularity | Each action on a page is set separately |
| Delete and approve | May be allowed to non-finance users, with a warning before saving |
| Data a granted user sees | Own branch; every branch of their organization if they have none (decided 25 Nov 2026) |
| Role change | Overrides stop applying |
| Expiry | Not in the first release |

## 2. How access is decided

For each user, page and action: **Default** (nothing stored), **Allow** or **Block**.

```
result = the override if present and valid, otherwise the role and department default
         then limited to what the organization's plan includes
```

- Blocking **View** blocks every action on the page.
- Allowing any action also allows View, unless View is blocked.
- Existing approval steps still apply: an allowed delete still goes through delete approval.

The server decides. Menus and buttons only reflect the decision.

## 3. Current state for this case

| Item | Today |
|---|---|
| HR employee menu | No invoices. Without a sub-department they get the Employee screens; with one, the HR screens |
| Screen routing | Neither dashboard has an `invoices` or `bill_receipts` screen |
| `GET /finance/invoices` | Any signed-in user can call it |
| Create and update invoice | Any signed-in user can call them |
| Delete and approve | Finance and Org Admin only |
| `InvoicesPanel` | No role checks: whoever opens it sees create, edit and delete |
| `BillReceiptPanel` | Reads only |
| Branch limit on the list | Also returns all partner invoices and invoices with no student |
| List size | Loads every invoice at once |

So adding a menu alone would give a blank screen, then full write buttons, and no real restriction.

## 4. Design

### 4.1 Pages and actions

| Key | Actions | Default |
|---|---|---|
| `invoices` | view, create, edit, delete, approve, download | Users with the Invoices menu view and download. Create and edit follow the invoice write rule. Delete and approve: Superadmin, Org Admin, Finance Admin and Sub Admin |
| `bill_receipts` | view, download | Org Admin and Finance screens |

Reminders, payment links and discounts are not part of these pages and stay role only.

### 4.2 Data

```
UserAccessOverride
  id, organizationId, userId, featureKey
  action           view | create | edit | delete | approve | download
  effect           allow | deny
  roleAtGrant, departmentIdAtGrant
  reason, grantedById, createdAt
  revokedAt, revokedById
```

One active row per user, page and action. Changes revoke the old row and add a new one, which gives history.

### 4.3 Server

| Item | Work |
|---|---|
| `access/catalog.ts` | Pages, actions, defaults |
| `access/resolve.ts` | Pure function returning what each user may do, with tests |
| `requireAccess(page, action)` | Replaces role guards on that page's routes |
| Admin API `/access` | List pages and users, read, save, history. Org Admin only |
| `login` and `/auth/me` | Return the user's access |

Endpoints for this case:

| Endpoint | Needs |
|---|---|
| `GET /finance/invoices`, `/invoices/:id` | view on `invoices` or `bill_receipts` |
| `GET /finance/receipt/invoice/:id`, `/receipt/payment/:id` | download on either, plus branch and organization check |
| `POST /finance/invoices` | `invoices` create |
| `PUT /finance/invoices/:id` | `invoices` edit. Changing status to approved must need approve |
| `DELETE /finance/invoices/:id` | `invoices` delete, then delete approval |
| `PUT /finance/invoices/:id/approve` | `invoices` approve |
| `/students`, `/operations/centers`, `universities`, `programs`, `/finance/fees` | Loaded only for the create and edit form |

### 4.4 Client

| Item | Work |
|---|---|
| Panel registry | Feature key to menu label and screen, usable from any dashboard |
| Menu | Add granted items under "Additional Access"; remove blocked ones |
| `can(page, action)` | Replaces role checks; shows only the buttons allowed |
| Access Control screen | Org Admin: pick user, set Default, Allow or Block per action, reason, history, reset |
| Invoices and Bill & Receipts | Server pagination; load form data only with create or edit |

## 5. Steps

| Step | Work | Check |
|---|---|---|
| 0 | Guard invoice create and update; refuse inactive users; stop public registration creating staff; stop HR resetting admin passwords | Each returns 403 |
| 1 | Table, catalogue, resolver, access in login. No visible change | Everyone's menu is unchanged |
| 2 | Log which users call the invoice endpoints, without blocking | No legitimate caller would be refused |
| 3 | Enforce; branch limit for granted users; pagination | Test list below passes |
| 4 | Access Control screen with these two features | HR employee case works end to end |
| 5 | More features | One group at a time |

Schema change: the local `.env` is production and `deploy.sh` runs `prisma db push --accept-data-loss`. Compare schemas, back up, and apply reviewed SQL that only creates the table.

## 6. Edge cases

### Granting
| Case | Rule |
|---|---|
| Admin grants to self | Block |
| Target is superadmin, Org Admin or CEO | Block |
| Target is student, faculty or partner login | Block |
| Target in another organization | 404 |
| Target has no branch | Allowed after a warning: the data covers every branch in the organization |
| Organization plan lacks the feature | Cannot be granted |
| Grant equals the role default | Store nothing |
| Two admins edit the same user | Reject the stale save |
| Feature whose API is not yet protected | Not shown on the screen |
| Bulk grant to many users | Not in the first release |

### User changes
| Case | Rule |
|---|---|
| Role changes, including the automatic change from "Reports To" | Overrides stop applying |
| Department changes (HR to Sales) | The role stays Employee, so also revoke on department change |
| Added to or removed from a sub-department | Default screens change; overrides stay on top |
| Branch changes | Data follows the new branch |
| Branch removed | Grant widens to every branch in the organization |
| Becomes branch manager | Branch menu applies; overrides add to it |
| Inactive or resigned | No access; not restored automatically |
| On leave | Access kept |
| User deleted | History kept |
| User is also a collections overseer | That access is separate; No access on a feature still wins |

### Combining
| Case | Rule |
|---|---|
| View blocked on a role default | Removed from menu; every action refused |
| Action allowed without View | View is added |
| Action allowed but View blocked | Nothing on the page; warn the admin |
| One action blocked | Its button hidden, its request refused, others unchanged |
| Override equals the default | Store nothing |
| Edit used to approve | Status changes to approved need approve |
| Edit used to change amounts of an approved invoice | Confirm; recommend refusing without approve |
| Delete allowed to a non-finance user | Warn before saving; delete approval still applies |
| `bill_receipts` only | May read invoice data needed for receipts, no Invoices menu |
| `invoices` blocked but `bill_receipts` allowed | Receipts work; Invoices refused |
| Other screens that read invoices (student profile, collections, payments) | Each keeps its own permission; blocking Invoices must not break them |
| New role default added later | Overrides remain differences |
| Unknown or removed page or action | Ignored |

### Data visibility
| Case | Rule |
|---|---|
| Partner invoices | Show only partners of the user's branch |
| Invoices with no student or partner | Hidden from granted users |
| Student's branch differs from the sales person's branch | Visible if either matches (same as today); confirm |
| Student moves branch | Their invoices move with them |
| `studentId`, search or filter parameters | Branch limit always applies |
| Opening an invoice or receipt by ID | Same check as the list |
| Totals and counts | Same scope as the rows |
| Export and download | Needs the download action, same scope |
| Student phone and email on invoices | Shown, as part of the invoice |
| Receipt file links | Check whether they open without sign-in |
| Dashboard cards and AI reports | No finance figures unless separately granted |

### Sessions
| Case | Rule |
|---|---|
| Revoked while signed in | Refused on the next request; menu updates |
| Granted while signed in | Appears after refresh or window focus |
| Revoked with a form open | Save fails with a clear message |
| Bookmarked page link | Checked against current access |
| Mobile app | Must use the same server checks; its menus not checked |

### Interface
| Case | Rule |
|---|---|
| User lands on a blocked page | First allowed page |
| Everything blocked | Own profile and attendance remain |
| Same menu ID in two dashboards | Feature keys, not menu IDs, identify screens |
| Granted screen links to a screen without access | Hide the link |
| View user sees empty create form data requests failing | Do not request them |

### Rollout
| Case | Rule |
|---|---|
| Old Team Permissions data | Currently has no effect; review before removal, do not convert automatically |
| Client deployed before server | Missing access data means defaults |
| Someone relies on the open invoice API | Found by step 2 logging |
| Audit | Record who, whom, what, before, after, reason |

## 7. Tests

| Case | Expected |
|---|---|
| HR employee, default | No menu; API 403 |
| View allowed | Both menus; lists open; own branch only |
| View only user creates, edits, deletes or downloads | 403; no buttons |
| View user opens another branch's invoice ID | 404 |
| Download allowed | Receipt opens |
| Back to Default | Next request 403 |
| Department changed | Override ignored |
| No branch | Grant covers every branch in the organization |
| Finance admin, no override | Unchanged |
| Finance admin with View blocked | Menu gone; API 403; student profile still works |
| Finance admin with Delete blocked | Other actions work; delete 403 |
| Org Admin of another organization | Refused |

## 8. Decisions (confirmed 2026-11-25)

| Question | Decision |
|---|---|
| May a user given access download and export? | Yes, set with the download action |
| Per-action switches instead of View and Manage? | Yes |
| May delete and approve be given to non-finance users? | Yes, with a warning |
| Partner invoices for a branch user? | Only the branch's partners |
| Revoke on department change as well as role change? | Yes |

## 9. Later decisions

| Question | Decision |
|---|---|
| Sales reads the invoice list through Payments? | Yes, reading only |
| Refuse student and faculty logins on all finance requests? | Yes |

## 10. Connecting all pages

Group by group, in the order of [all-features.md](all-features.md).

### Students page (connected)

| Rule | Behaviour |
|---|---|
| Users without a setting | Server routes accept the same roles as before |
| Given the page without having it by role | Only the page settings count; own branch only |
| Fees and payments | Not sent unless the user can also view invoices |
| Login credentials | Not sent without edit |
| Bulk changes | Refused for permissions that come from an override; import adds new students only |
| View blocked | Page and its changes refused. The student list request stays readable because other screens use it |

### Student Filters, Admission Review, Admission Sessions (connected)

| Page | Data a user given the page sees |
|---|---|
| Student Filters | Organization-wide: filters are settings, not branch records |
| Admission Sessions | Organization-wide: sessions have no branch |
| Admission Review | Own branch (student or sales person), without passwords; fees only with invoice access |

Also fixed: admission review approve, reject, document and photo actions, and session update, delete and approve, now check the organization.

### Sales admission pages (connected)

Decision: a user given one of these pages sees everything in their branch.

| Page | Notes |
|---|---|
| Generate Student Link | Links created by people in the branch |
| Provisional Enrollment | May only enrol existing students of the branch |
| Admission Pipeline, Admission Approval | Applications whose student or sales person is in the branch; no passwords; fees only with invoice access |
| Student Portal Management | Branch students; Edit changes portal logins only. Blocking and unlocking videos stays with the Org Admin |

Also fixed: link regeneration, sales admin approval and rejection, and receipt upload now check the organization.

### Finance, first part: Payments, Expenses, Fee Structures, Discounts (connected)

| Rule | Behaviour |
|---|---|
| Expense status | Only a user with approve may set or change it |
| Expense claims | Anyone may submit their own; without approve, only pending ones can be changed, and only your own unless the page gives you edit |
| Own expense | A user given approve cannot decide their own claim |
| Data for users given a page | Own branch; fee structures are organization-wide |

Also fixed: fee structures and payment targets check the organization, and the payment list no longer sends student portal passwords.

### Finance, second part (connected)

Pending Payments, Provisional Verifications, Finance Enrollments, Wallet Top-up, Student Payment Log, Payment Gateway, University Fee, University Commissions, Finance Sales Target and Collections.

- Users given a page see their branch only. A partner belongs to a branch when its referrer or a student does.
- Only an Org Admin setting hides a menu or button; a role default of "no" alone does not (collections overseers keep their page).
- Fixed: partner finance verification, wallet top-up decisions, finance enrollment decisions, receipt verification, payment links, installment updates and university payments now check the organization; a rejected wallet top-up must be pending.

### Remaining pages: block only (66 pages)

Listed in `server/src/access/blockPages.ts` with the requests each one refuses. `protect` checks them, so no route changed and users without a setting are unaffected.

- Allow is not offered: giving these pages to another role needs per-page data limits.
- Requests shared with personal screens (own leave, punch in, own tasks, own pay slips, shared lists) are never refused. For pages built only on those, blocking View hides the menu and screen only.
- Buttons on these pages are not hidden; a blocked action is refused with a message.

## Payroll group (connected 25 Nov 2026)

Staff roles and the CEO accept Allow. Superadmin, Org Admin, students, faculty and partner logins stay locked. Remaining block-only groups are being connected one at a time.

| Rule | Behaviour |
|---|---|
| Data for users given a page | Own branch; every branch of the organization if they have none |
| Own pay | Someone acting on given access cannot create, edit, delete or approve their own payroll or salary |
| Edit without Approve | Cannot change a payroll record's status; new records are drafts |
| Salary change made with given access | Goes back to pending approval |
| Salary cycle | Organization-wide, so a given user with a branch cannot change it |
| General Manager's salary | Not visible to a given user who has a branch |
| Mark a payroll as paid | Follows Payroll Batches → Edit |
| Confirm, process, transfer | Follow Payroll → Approve |
| My Pay Slips | Stays personal for users given Payroll |


## Reports group (connected 25 Nov 2026)

| Rule | Behaviour |
|---|---|
| Data for users given a report | Own branch; every branch of the organization if they have none |
| Sales reports | A given user sees the whole branch, not only a reporting line |
| Student Report | Opens the student list with the same limits as the Students page: no passwords, fees only with invoice access, and student details can be read |
| Income & Expense, Profit & Loss | Share one request; either page allows it |
| University Report | Program and session counts are organization-wide; student counts follow the branch |

## People (HR), day-to-day pages (connected 25 Nov 2026)

Employees, Branch Hierarchy, Team Attendance, Attendance Settings, Biometric Devices, Leave Approvals, Leave Allocation, Holidays, Vacancies, Complaints, Assets.

| Rule | Behaviour |
|---|---|
| Data for users given a page | Own branch; every branch of the organization if they have none |
| Own records | Someone acting on given access cannot change or approve their own attendance, leave, leave allocation or complaint |
| Leave approval given | Gives the final decision; the General Manager's leave stays with the CEO and Org Admin |
| Organization-wide settings | Holidays, Vacancies and Attendance Settings have no branch, so a given user changes them for everyone |
| General Manager | Not visible to a given user who has a branch |

## Accounts and structure (connected 25 Nov 2026)

Users, Departments, Branches, Org Chart, Managers.

| Rule for someone acting on given access | Behaviour |
|---|---|
| Accounts they may manage | Employees (and their own role if it is Sales, Finance or Collections), in their branch, in their department or none |
| Accounts they may not touch | Their own, admins and managers, anyone with a sub-department or with pages an Org Admin allowed |
| Fields they may not set | Sub-department, extra departments, reporting manager, study center |
| Departments | Cannot change a department's type or manager, or change or delete their own department |
| Branches | With a branch of their own: only that branch, and no deleting |
| Appointments | Cannot appoint themselves; the person must be in reach |
| Remaining risk | Branches or Managers lets them make someone else a manager, which gives that person more screens. Saving such access asks the Org Admin to confirm |

Also fixed for everyone: department, branch and position requests did not check the organization, and some responses included password hashes. All responses now drop password hashes.

## Academics and partners (connected 25 Nov 2026)

Universities, Programs, Program Allocation, Academic Partners, Academic Partners (Sales view), Academic Centers, Faculties, Study Abroad Partners (view only).

| Rule for someone acting on given access | Behaviour |
|---|---|
| Universities, Programs, Academic Centers, Faculties, Study Abroad Partners | Organization-wide: these have no branch |
| Programs | Fees are saved only if they may also change Fee Structures |
| Academic Partners, Program Allocation | With a branch: partners referred by, or with students of, that branch |
| Partner portal login | Not sent to them and not changeable; status is not changeable |
| Remaining risk | Creating a partner or faculty member lets them set up that login |

Also fixed for everyone: any signed-in user could read partner portal passwords; student and faculty logins can no longer read partner records; partner, university, program and allocation requests check the organization.

## University work, Documents, Communication, Sales and tasks (connected 25 Nov 2026)

Every page can now be given except Executive Tasks, which has no screen of its own.

| Rule for someone acting on given access | Behaviour |
|---|---|
| University work, Documents, Exam Registration | Students of their branch; no passwords. Submission and Re-registration save only that one value |
| Targets, Team Performance, Tasks, Escalations, Meetings | Their branch; every branch if they have none. Own targets and escalations cannot be changed |
| Announcements, Polls, Messages, Leads | Organization-wide: these have no branch |
| Pages everyone already has (My Escalations, Notice Board, Important Updates) | Allow adds the menu entry |

Also fixed for everyone: tasks, escalations, announcements, polls, meetings and exam registrations did not check the organization; anyone could list every escalation; document records included student passwords; student and faculty logins could read sales leads; sales targets were filtered by a field that does not exist.
