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

| Rule | Behaviour |
|---|---|
| Who assigns | Org Admin only |
| Direction | Add and remove |
| Granularity | Each action on a page is set separately |
| Delete and approve | May be allowed to non-finance users, with a warning before saving |
| Data a granted user sees | Own branch only |
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
| Target has no branch | Refuse: "own branch" cannot be applied. Assign a branch first |
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
| Branch removed | Grant stops returning data |
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
| No branch | Grant refused |
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

### Waiting for a decision

Generate Student Link, Provisional Enrollment, Admission Pipeline and Admission Approval list records belonging to a sales person. Decide what a user given these pages should see. Student Portal Management follows them.
