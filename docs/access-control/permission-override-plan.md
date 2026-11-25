# Per-user permission override: plan and edge cases

Date: 2026-11-25. Status: step 0 coded, not committed or deployed.
First case: an HR employee gets **view** access to **Invoices** and **Bill & Receipts**.

## 1. Rules already decided

| Rule | Behaviour |
|---|---|
| Who assigns | Org Admin only |
| Direction | Add and remove |
| Levels | View, Manage (includes View) |
| Data a granted user sees | Own branch only |
| Role change | Overrides stop applying |
| Expiry | Not in the first release |

## 2. How access is decided

Each user and feature has one setting: **Default** (nothing stored), **No access**, **View** or **Manage**.

```
result = override if present and valid, otherwise the role and department default
         then limited to what the organization's plan includes
```

The server decides. The menu only reflects the decision.

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

### 4.1 Feature keys

| Key | View | Manage |
|---|---|---|
| `invoices` | List, search, filters, detail, open and download invoice | Create, edit |
| `bill_receipts` | List, open and download receipts | (none today) |

Delete, approve, reminders, payment links and discounts stay with finance roles and Org Admin, whatever the override.

### 4.2 Data

```
UserAccessOverride
  id, organizationId, userId, featureKey
  level            none | view | manage
  roleAtGrant, departmentIdAtGrant
  reason, grantedById, createdAt
  revokedAt, revokedById
```

One active row per user and feature. Changes revoke the old row and add a new one, which gives history.

### 4.3 Server

| Item | Work |
|---|---|
| `access/catalog.ts` | Features, levels, default roles |
| `access/resolve.ts` | Pure function returning each feature's level, with tests |
| `requireFeature(key, level)` | Replaces role guards on that feature's routes |
| Admin API `/access` | List features and users, read, save, history. Org Admin only |
| `login` and `/auth/me` | Return the user's access |

Endpoints for this case:

| Endpoint | Guard |
|---|---|
| `GET /finance/invoices`, `/invoices/:id` | `invoices` or `bill_receipts` view |
| `GET /finance/receipt/invoice/:id`, `/receipt/payment/:id` | Same, and check branch and organization |
| `POST`, `PUT /finance/invoices` | `invoices` manage |
| `/students`, `/operations/centers`, `universities`, `programs`, `/finance/fees` | Not needed for view if the screen loads them only for the create and edit form |

### 4.4 Client

| Item | Work |
|---|---|
| Panel registry | Feature key to menu label and screen, usable from any dashboard |
| Menu | Add granted items under "Additional Access"; remove blocked ones |
| `can(key, level)` | Replaces role checks; hides write buttons |
| Access Control screen | Org Admin: pick user, set each feature, reason, history, reset |
| Invoices and Bill & Receipts | Server pagination; load form data only for `manage` |

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
| No access on a role default | Removed from menu and refused by the API |
| Manage granted | Includes View |
| Manage reduced to View | Write buttons hidden, writes refused |
| `bill_receipts` only | May read invoice data needed for receipts, no Invoices menu |
| `invoices` blocked but `bill_receipts` allowed | Receipts work; Invoices refused |
| Other screens that read invoices (student profile, collections, payments) | Each keeps its own permission; blocking Invoices must not break them |
| New role default added later | Overrides remain differences |
| Unknown or removed feature key | Ignored and logged |

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
| Export and download | Allowed with View, same scope; confirm |
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
| View granted | Both menus; list and receipts open; own branch only |
| View user creates or edits | 403; no buttons |
| View user opens another branch's invoice ID | 404 |
| Back to Default | Next request 403 |
| Department changed | Override ignored |
| No branch | Grant refused |
| Finance admin, no override | Unchanged |
| Finance admin set to No access | Menu gone; API 403; student profile still works |
| Org Admin of another organization | Refused |

## 8. Decisions (confirmed 2026-11-25)

| Question | Decision |
|---|---|
| May a View user download and export? | Yes |
| Partner invoices for a branch user? | Only the branch's partners |
| Revoke on department change as well as role change? | Yes |
