# Nautilus — Personal Finance App

## Project Overview

Nautilus is a personal finance web app built to replace "Wallet by BudgetBakers." It is a zero-cost, self-hosted multi-user SaaS where each registered user manages their own financial life in complete isolation. Built for daily use in Uganda (default currency: Ugandan Shillings / UGX) and designed to work reliably regardless of network conditions.

### Core Constraints (non-negotiable)
- **Offline-first**: The app must be fully functional without internet. Transactions added offline sync automatically when connectivity returns.
- **Zero budget**: $0/month operating cost with a clear paid-tier upgrade path if the user base grows.
- **Distinctive UI**: No generic AI card layouts, no shadow-based elevation, no standard Tailwind palette. Specific design decisions are documented in the UI Design System section and must be followed exactly.
- **Multi-user**: Friends sign up and use the app independently. No shared wallets for MVP.

### Non-goals (MVP)
- Native mobile app (PWA covers this)
- Bank API integrations (all transactions are manual or imported)
- Real-time collaboration
- Group shared wallets

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Full-stack, free, Vercel-native, server components |
| Styling | Tailwind CSS + custom design system | shadcn/ui used for primitives only (Dialog, Sheet, Select); all visual styling custom |
| Charts | Recharts (custom theme) | Free, React-native, all defaults overridden |
| Forms | React Hook Form + Zod | Minimal re-renders, shared client/server validation |
| Server data | TanStack Query (React Query) | `networkMode: 'offlineFirst'`, optimistic updates, built-in retry — better offline than SWR |
| Client state | Zustand | UI state (period selector, filter state, widget order) |
| Offline queue | Dexie.js (IndexedDB wrapper) | Stores pending mutations when offline; flushed to server on reconnect |
| PWA | next-pwa (Workbox) | Service worker, asset caching, offline shell, "Add to Home Screen" on iOS/Android |
| Database | Neon PostgreSQL (free tier) | 0.5GB, no inactivity pausing, Prisma-compatible |
| ORM | Prisma 5+ | Type-safe, migrations, generated client |
| Auth | NextAuth.js v4 (credentials provider) | Email + password, session management, per-user data isolation |
| Deployment | Vercel Hobby (free) | Zero-config Next.js, custom domain, preview deployments |
| Cron | GitHub Actions (free 2000 min/mo) | Daily job calls protected `/api/cron/process-recurring` — replaces Vercel Cron (Pro-only, paid) |
| Exchange rates | Frankfurter API (frankfurter.app) | 100% free, no API key required, ECB rates, major world currencies |
| Icons | Lucide React | Tree-shakeable, consistent |
| Dates | date-fns | Recurring date math, period calculations |
| Fonts | Space Grotesk + JetBrains Mono | Google Fonts via next/font — free |

**Monthly cost: $0**

**Scalability path (no rewrites required):**
- Vercel Pro: $20/mo → longer function timeouts, Vercel Cron, more bandwidth
- Neon paid: pay-as-you-go beyond 0.5GB storage

---

## Offline-First Architecture

### Data flow

```
User action (add transaction, edit budget, etc.)
         │
         ▼
  Write to Dexie (IndexedDB) ──→ UI updates instantly (optimistic)
         │
         ├── Online? ──Yes──→ Flush pendingMutations to server API
         │                    └── On success: mark record synced in Dexie
         │                    └── On failure: keep in queue, retry next flush
         │
         └── Offline? ──────→ Record stays in Dexie as "pending"
                               Browser 'online' event fires later
                               └── Sync layer flushes queue automatically
```

### Dexie local database schema

```typescript
// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface PendingMutation {
  id?: number;           // auto-increment
  method: 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;      // e.g. '/api/transactions'
  payload: unknown;      // request body
  resourceId?: string;   // for PATCH/DELETE
  createdAt: number;     // timestamp, used for ordering
  retries: number;
}

export interface LocalTransaction {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  date: string;          // ISO date string
  note?: string;
  isPending: boolean;
  synced: boolean;       // false = created offline, not yet confirmed by server
  updatedAt: number;
}

export interface LocalAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: number;
  color?: string;
  icon?: string;
  includeInTotal: boolean;
  synced: boolean;
}

class NautilusDB extends Dexie {
  pendingMutations!: Table<PendingMutation>;
  transactions!: Table<LocalTransaction>;
  accounts!: Table<LocalAccount>;

  constructor() {
    super('nautilus');
    this.version(1).stores({
      pendingMutations: '++id, createdAt',
      transactions: 'id, accountId, date, synced',
      accounts: 'id',
    });
  }
}

export const db = new NautilusDB();
```

### Sync layer

```typescript
// src/lib/sync.ts
export async function flushPendingMutations(): Promise<void> {
  if (!navigator.onLine) return;

  const pending = await db.pendingMutations
    .orderBy('createdAt')
    .toArray();

  for (const mutation of pending) {
    try {
      await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: { 'Content-Type': 'application/json' },
        body: mutation.method !== 'DELETE' ? JSON.stringify(mutation.payload) : undefined,
      });
      await db.pendingMutations.delete(mutation.id!);
    } catch {
      await db.pendingMutations.update(mutation.id!, { retries: mutation.retries + 1 });
      if (mutation.retries >= 5) {
        // Surface error to user via toast
      }
      break; // Stop processing on first failure (maintain order)
    }
  }
}

// Called in root layout:
// window.addEventListener('online', flushPendingMutations)
// document.addEventListener('visibilitychange', () => {
//   if (document.visibilityState === 'visible') flushPendingMutations()
// })
```

### Conflict resolution
Last-write-wins based on `updatedAt` timestamp. Since each account belongs to a single user and the app is used on one device at a time in practice, conflicts are extremely rare. No CRDTs needed.

### Sync status indicator
A small dot in the top-right of the app bar:
- Pulsing amber dot: pending mutations in queue (syncing)
- Solid green dot: all synced (fades out after 3 seconds)
- Hidden by default

### PWA setup (next-pwa)

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^\/api\/(accounts|categories|labels|transactions)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
  ],
});
module.exports = withPWA({ /* next config */ });
```

Add `public/manifest.json` with app name, icons (192px and 512px), `display: "standalone"`, `background_color: "#080B14"`, `theme_color: "#080B14"`.

### What works offline
- Add / edit / delete transactions
- View all records, balances, categories (last cached state)
- View dashboard widgets and charts (from cache)
- View statistics (computed from cached transactions)
- Create / edit budgets and planned payments
- All settings changes

### What requires connectivity
- First-time registration and login
- Fetching latest exchange rates (rates cached locally after first fetch)

---

## Feature List

### Authentication
- Email + password registration and login
- Per-user data isolation enforced at DB level (`userId` FK on every resource)
- Profile: display name, email, password change
- Account deletion with full data wipe
- Session via NextAuth database sessions (more secure than JWT for finance data)

### Accounts
- Types: Cash, Checking, Savings, Credit Card, Investment, Loan, Other
- Fields: name, type, currency, opening balance, color (hex), icon (emoji), include-in-total flag, sort order
- Archive (soft delete) — cannot hard delete accounts with transactions
- Transfer between accounts (first-class transaction type)

### Transactions
- **Income**: increases account balance
- **Expense**: decreases account balance
- **Transfer**: moves money between two user accounts (single DB row, source + destination)
- Fields: type, amount (integer minor units), currency, account, category, date, note, labels (many-to-many), is-pending flag
- Auto-rules applied on save (see Settings)
- Stored amounts as integers (see Implementation Notes)

### Dashboard
- **Account cards**: horizontal scroll row, each card shows account name, type icon, balance; "Add account" card at end
- **Balance Trend**: area chart, net worth over time, configurable period
- **Expenses Donut**: donut chart of expenses by category or label (toggle)
- **Top Expenses**: ranked category list with amounts and percentage bars
- **Last Records**: 5 most recent transactions
- **Cash Flow**: income vs expenses bar chart, monthly default
- **Widget visibility**: user can show/hide each widget (saved to user settings JSON)
- **FAB** (floating action button): "+" fixed bottom-right, opens add-transaction sheet

### Planning
- **Budgets**: spending limit per category set, period (weekly/monthly/quarterly/yearly), account filter, progress bar, color-coded status (ok/warning/exceeded)
- **Planned Payments**: recurring transaction rules (frequencies: once/daily/weekly/biweekly/monthly/quarterly/yearly), next due date, reminder days, auto-confirm option

### Statistics
- Overview cards: Balance, Spending, Cash Flow, Outlook, Credit
- Income report with % vs previous period
- Expense report with category breakdown
- Cash flow bar chart (by week/day within period)
- Category drill-down (tap category → list of transactions)
- Label report
- Period navigation: prev/next month arrows + period picker (week/month/quarter/year/custom)

### Records (Transaction History)
- Paginated list, newest first, grouped by date
- Search by note text
- Filter: account, category, label, type, date range, amount range
- CSV export
- Bulk delete

### Settings
- **General**: display name, default currency (UGX), date format, week start, timezone
- **Dashboard**: widget visibility and order
- **Accounts**: CRUD + reorder
- **Currency**: default currency, manual exchange rate overrides
- **Automatic Rules**: condition (note contains / amount >/</=) → action (set category/label/account)
- **Labels**: CRUD (name, color)
- **Categories**: CRUD (name, icon/emoji, color, type income/expense, parent for subcategories), seed defaults on register
- **Templates**: named transaction presets for quick entry
- **Notifications**: in-app bell notifications (budget exceeded, planned payment due)
- **Personal Data & Privacy**: export JSON/CSV, delete account
- **Security**: change password

### Investments (Post-MVP)
Deferred. Will track holdings, quantity, purchase price, current price from a free API.

---

## Database Schema

All amounts stored as integers in smallest currency unit. All tables have `createdAt` and `updatedAt`. Currency fields use ISO 4217 codes (e.g. `"UGX"`, `"USD"`).

### users
```
id              String   @id @default(cuid())
email           String   @unique
name            String?
passwordHash    String?
defaultCurrency String   @default("UGX")
dateFormat      String   @default("DD/MM/YYYY")
weekStart       String   @default("monday")
timezone        String   @default("Africa/Kampala")
dashboardLayout Json?
createdAt       DateTime @default(now())
updatedAt       DateTime @updatedAt
```

### accounts
```
id              String   @id @default(cuid())
userId          String
name            String
type            String        -- cash|checking|savings|credit_card|investment|loan|other
currency        String   @default("UGX")
openingBalance  Int      @default(0)
color           String?
icon            String?
includeInTotal  Boolean  @default(true)
isArchived      Boolean  @default(false)
sortOrder       Int      @default(0)
@@index([userId])
```

### categories
```
id              String   @id @default(cuid())
userId          String
name            String
type            String        -- income|expense
icon            String?
color           String?
parentId        String?       -- self-referential subcategory
isDefault       Boolean  @default(false)
isArchived      Boolean  @default(false)
sortOrder       Int      @default(0)
@@index([userId])
```

### labels
```
id              String   @id @default(cuid())
userId          String
name            String
color           String?
@@unique([userId, name])
@@index([userId])
```

### transactions
```
id              String   @id @default(cuid())
userId          String
type            String        -- income|expense|transfer
amount          Int           -- always positive
currency        String
accountId       String
toAccountId     String?       -- transfers only
categoryId      String?       -- null for transfers
date            DateTime
note            String?
isPending       Boolean  @default(false)
templateId      String?
recurringRuleId String?
@@index([userId])
@@index([accountId])
@@index([date])
```

### transaction_labels
```
transactionId   String
labelId         String
@@id([transactionId, labelId])
```

### recurring_rules
```
id              String   @id @default(cuid())
userId          String
name            String
type            String
amount          Int
currency        String
accountId       String
toAccountId     String?
categoryId      String?
note            String?
frequency       String        -- once|daily|weekly|biweekly|monthly|quarterly|yearly
startDate       DateTime
endDate         DateTime?
nextDueDate     DateTime
reminderDays    Int      @default(0)
autoConfirm     Boolean  @default(false)
isActive        Boolean  @default(true)
@@index([userId])
@@index([nextDueDate])
```

### budgets
```
id              String   @id @default(cuid())
userId          String
name            String
amount          Int
currency        String
period          String        -- weekly|monthly|quarterly|yearly|custom
startDate       DateTime
endDate         DateTime?
accountFilter   String[]      -- empty = all accounts
@@index([userId])
```

### budget_categories
```
budgetId        String
categoryId      String
@@id([budgetId, categoryId])
```

### templates
```
id              String   @id @default(cuid())
userId          String
name            String
type            String
amount          Int?
currency        String
accountId       String?
categoryId      String?
note            String?
@@index([userId])
```

### auto_rules
```
id              String   @id @default(cuid())
userId          String
name            String
sortOrder       Int      @default(0)
isActive        Boolean  @default(true)
conditionField  String        -- note|amount|account
conditionOp     String        -- contains|equals|greater_than|less_than
conditionValue  String
actionType      String        -- set_category|set_label|set_account
actionValue     String        -- ID of target
@@index([userId])
```

### notifications
```
id              String   @id @default(cuid())
userId          String
type            String        -- planned_payment_due|budget_exceeded|budget_warning
title           String
body            String
isRead          Boolean  @default(false)
relatedId       String?
relatedType     String?
@@index([userId, isRead])
```

### exchange_rates
```
id              String   @id @default(cuid())
base            String
target          String
rate            Float
fetchedAt       DateTime
isManual        Boolean  @default(false)
@@unique([base, target])
```

---

## App File Structure

```
nautilus/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    -- seed default categories for new users
│   └── migrations/
│
├── public/
│   ├── manifest.json              -- PWA manifest
│   └── icons/                     -- 192x192 and 512x512 app icons
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             -- root: <html class="dark">, fonts, PWA meta tags
│   │   ├── page.tsx               -- redirect: authed → /dashboard, else → /login
│   │   ├── globals.css            -- CSS custom properties (all --bg-*, --text-*, etc.)
│   │   │
│   │   ├── (auth)/                -- no bottom nav
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (app)/                 -- authenticated; renders BottomNav
│   │   │   ├── layout.tsx         -- session guard, sync listener, BottomNav, FAB
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── planning/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── budgets/new/page.tsx
│   │   │   │   ├── budgets/[id]/edit/page.tsx
│   │   │   │   ├── planned/new/page.tsx
│   │   │   │   └── planned/[id]/edit/page.tsx
│   │   │   ├── statistics/page.tsx
│   │   │   ├── records/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── more/page.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── layout.tsx         -- back-button header, no bottom nav
│   │   │   ├── page.tsx
│   │   │   ├── general/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── accounts/new/page.tsx
│   │   │   ├── accounts/[id]/edit/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── currency/page.tsx
│   │   │   ├── labels/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── auto-rules/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── security/page.tsx
│   │   │   └── data/page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── accounts/route.ts
│   │       ├── accounts/[id]/route.ts
│   │       ├── transactions/route.ts
│   │       ├── transactions/[id]/route.ts
│   │       ├── categories/route.ts
│   │       ├── categories/[id]/route.ts
│   │       ├── labels/route.ts
│   │       ├── labels/[id]/route.ts
│   │       ├── budgets/route.ts
│   │       ├── budgets/[id]/route.ts
│   │       ├── recurring-rules/route.ts
│   │       ├── recurring-rules/[id]/route.ts
│   │       ├── templates/route.ts
│   │       ├── templates/[id]/route.ts
│   │       ├── auto-rules/route.ts
│   │       ├── auto-rules/[id]/route.ts
│   │       ├── statistics/route.ts
│   │       ├── dashboard/route.ts
│   │       ├── exchange-rates/route.ts
│   │       ├── notifications/route.ts
│   │       ├── export/route.ts
│   │       └── cron/
│   │           └── process-recurring/route.ts   -- called by GitHub Actions daily
│   │
│   ├── components/
│   │   ├── ui/                    -- shadcn primitives only (Dialog, Sheet, Select, etc.)
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx      -- floating pill nav
│   │   │   ├── TopBar.tsx         -- back arrow or title + bell + gear
│   │   │   ├── FAB.tsx            -- floating "+" button
│   │   │   └── SyncIndicator.tsx  -- amber/green dot for offline queue status
│   │   ├── dashboard/
│   │   │   ├── AccountCard.tsx
│   │   │   ├── AccountCardRow.tsx
│   │   │   ├── BalanceTrendChart.tsx
│   │   │   ├── ExpensesDonutChart.tsx
│   │   │   ├── TopExpensesList.tsx
│   │   │   ├── LastRecordsList.tsx
│   │   │   └── CashFlowChart.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionSheet.tsx   -- bottom sheet opened by FAB
│   │   │   ├── TransactionForm.tsx    -- amount + fields
│   │   │   ├── TransactionRow.tsx     -- ledger-style row
│   │   │   └── TransactionList.tsx    -- grouped-by-date list
│   │   ├── planning/
│   │   │   ├── BudgetCard.tsx
│   │   │   ├── BudgetForm.tsx
│   │   │   ├── PlannedPaymentCard.tsx
│   │   │   └── PlannedPaymentForm.tsx
│   │   ├── statistics/
│   │   │   ├── PeriodSelector.tsx
│   │   │   ├── StatOverviewCards.tsx
│   │   │   └── CategoryBreakdownList.tsx
│   │   └── shared/
│   │       ├── AmountDisplay.tsx      -- formats integer amount with currency
│   │       ├── CurrencyInput.tsx      -- large centered number input
│   │       ├── CategoryChip.tsx       -- colored pill with icon
│   │       ├── DatePicker.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── EmptyState.tsx         -- typographic empty state (no illustrations)
│   │       └── SkeletonBar.tsx        -- animated loading bar
│   │
│   ├── lib/
│   │   ├── prisma.ts              -- Prisma singleton
│   │   ├── auth.ts                -- NextAuth authOptions
│   │   ├── db.ts                  -- Dexie local DB (see Offline Architecture)
│   │   ├── sync.ts                -- flushPendingMutations()
│   │   ├── currency.ts            -- formatAmount(), convertAmount(), fetchRates()
│   │   ├── dates.ts               -- period helpers, advanceNextDueDate()
│   │   ├── auto-rules.ts          -- applyAutoRules() called before transaction save
│   │   ├── seed-categories.ts     -- default category list
│   │   ├── validators/            -- Zod schemas per resource
│   │   └── utils.ts               -- cn(), clsx()
│   │
│   ├── hooks/
│   │   ├── useAccounts.ts
│   │   ├── useTransactions.ts
│   │   ├── useBudgets.ts
│   │   ├── useCategories.ts
│   │   ├── useStatistics.ts
│   │   └── useSync.ts             -- exposes pendingCount, isSyncing
│   │
│   └── types/
│       └── index.ts               -- all shared types
│
├── .github/
│   └── workflows/
│       └── daily-cron.yml         -- GitHub Actions cron (see below)
│
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## UI Design System

### Philosophy
**Data precision aesthetic.** The interface recedes; the numbers command attention. Inspired by Bloomberg Terminal clarity crossed with iOS precision. Every design decision either surfaces financial data better or gets cut.

### Typography
Two fonts only. No exceptions.

```
Space Grotesk   → headings, labels, nav text, all UI chrome
JetBrains Mono  → ALL monetary amounts, dates, percentages, account numbers
```

Load via `next/font/google`. Apply `font-variant-numeric: tabular-nums` globally to JetBrains Mono so digit widths are consistent — amounts never shift layout as values change.

### Color palette (exact values — do not substitute Tailwind defaults)

Define these as CSS custom properties in `globals.css`. Reference them via Tailwind's `arbitrary value` syntax or extend the Tailwind config to map them.

```css
:root {
  /* Backgrounds */
  --bg-base:          #080B14;
  --bg-surface:       #0F1320;
  --bg-elevated:      #161B2E;
  --bg-subtle:        #1C2236;

  /* Borders */
  --border-default:   #252D44;
  --border-strong:    #3A4560;

  /* Text */
  --text-primary:     #EEF0F8;
  --text-secondary:   #7A84A0;
  --text-muted:       #404860;

  /* Accent */
  --accent:           #4F8EF8;
  --accent-glow:      rgba(79, 142, 248, 0.15);

  /* Semantic amounts */
  --income:           #3DD68C;
  --income-subtle:    rgba(61, 214, 140, 0.10);
  --expense:          #F06060;
  --expense-subtle:   rgba(240, 96, 96, 0.10);
  --transfer:         #9B8EF2;
  --transfer-subtle:  rgba(155, 142, 242, 0.10);
  --warning:          #F0A030;
  --warning-subtle:   rgba(240, 160, 48, 0.10);
}
```

### Elevation — borders only, zero shadows
No `box-shadow` anywhere. Depth is communicated through:
1. Background lightness steps (base → surface → elevated → subtle hover)
2. Border opacity (stronger border = more prominent)
3. `backdrop-blur-md` on sheets and modals only

### Navigation — floating pill
The bottom nav is a floating pill centered horizontally above the safe-area bottom, not a full-width bar:

```
  ┌──────────────────────────────────┐
  │  [⊞]     [◷]     [▦]     [···]  │  ← border: 1px var(--border-strong)
  └──────────────────────────────────┘    backdrop-blur-md, bg: rgba(15,19,32,0.85)
```

- Width: `w-fit px-6`, centered with `mx-auto`
- Position: `fixed bottom-6 left-0 right-0`
- Active tab: `var(--accent)` icon, no label
- Inactive tabs: icon only in `var(--text-muted)`
- Active indicator: small 2px accent-colored dot below the icon (not background highlight)
- The pill sits above any content and lets the page breathe around it

### Account cards — left color bar
Each account card has a 3px solid vertical bar on the left edge in the account's assigned color. The card body is uniform `var(--bg-surface)`. No colored backgrounds, no gradients.

```
│███│  CASH                  USh 823,300 │
│   │  Cash account          ↑ +12% MTD  │
```

### Transaction list rows — ledger style
No card borders between rows. Rows are separated by a single 1px `var(--border-default)` divider.

```
│  ▌  🍔  Restaurant, fast-food          -USh 5,000  │
│     Cash                               4 Feb        │
```

- Left edge: 2px `border-l` in category color
- Category icon: 20px, no background circle
- Note: `text-primary text-sm`
- Account: `text-secondary text-xs` below note
- Amount: right-aligned, JetBrains Mono, colored by type
- Date: far right, `text-muted text-xs`

### Amount input
When adding a transaction, the amount gets a dedicated fullscreen-style step inside the bottom sheet:

```
              USh
         823,300
```

- Giant centered number: `text-6xl font-mono`
- Currency prefix: `text-secondary text-lg` above and left of number
- `inputmode="decimal"` — triggers numeric keyboard on mobile
- Backspace clears digit by digit (custom input logic, not a standard `<input>`)
- Category and account appear as chips below, selectable inline — no second screen/step
- Single "Save" button at the bottom

### Charts — decoration-free

All chart containers: no card border, no background. The chart floats in the section.

- **Area/Line chart**: `type="monotone"`, no dot markers, gradient fill fades from `var(--accent)` at top to transparent at bottom (`<defs><linearGradient>`)
- **Donut chart**: `strokeWidth={14}`, muted grey `var(--border-default)` for unfilled arc, no labels on the chart itself — amounts shown in a legend below
- **Bar chart**: narrow bars (`barSize={6}`), `var(--income)` and `var(--expense)` fills, no bar value labels, no grid lines (only a faint baseline)
- No Recharts default tooltips — replace with custom inline labels or a fixed summary above the chart

### Empty states — typographic only
No SVG illustrations.

```
         —
   No transactions yet.
   Add your first one ↗
```

- Large dash or "0" in `var(--text-muted)`, `text-5xl font-mono`
- One explanatory line in `var(--text-secondary)`
- One CTA as a plain text link (`text-accent underline-offset-4`)

### Loading states — skeleton bars only
No spinners. Skeleton bars are `bg-[var(--bg-subtle)] animate-pulse rounded` at the correct widths for their content. The app must feel like data appears, not like it's waiting.

### Micro-details
- Transitions: `transition-all duration-150 ease-out` for interactions; `duration-250` for sheet open/close
- Focus rings: `outline-2 outline-offset-2 outline-[var(--accent-glow)]` — visible but quiet
- Active press states: `active:scale-[0.97]` on tappable cards and buttons
- FAB: `bottom-24` (above the floating nav pill), shadow-free, `bg-[var(--accent)]`, 56px circle

---

## Key Implementation Notes

### Integer storage for monetary amounts
Never use floats for money. UGX has no sub-units, so `USh 45,000 = 45000` (integer). USD uses cents: `$10.50 = 1050`. Store as `Int` in Prisma. The `currency.ts` utility handles formatting:

```typescript
export function formatAmount(minor: number, currency: string): string {
  const decimals = getCurrencyDecimals(currency); // 0 for UGX, 2 for USD
  const value = minor / Math.pow(10, decimals);
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
  }).format(value);
}
```

### Account balance calculation
Balances are **never stored**. Always computed:

```sql
balance = openingBalance
        + SUM(amount) FILTER (WHERE type = 'income' AND accountId = ?)
        - SUM(amount) FILTER (WHERE type = 'expense' AND accountId = ?)
        + SUM(amount) FILTER (WHERE type = 'transfer' AND toAccountId = ?)
        - SUM(amount) FILTER (WHERE type = 'transfer' AND accountId = ? AND toAccountId IS NOT NULL)
```

Run as a single Prisma `groupBy` or raw SQL across all user accounts. Cache for 60 seconds; bust on any transaction mutation via TanStack Query `invalidateQueries`.

### Multi-currency conversion
Rates fetched from Frankfurter API: `https://api.frankfurter.app/latest?from=EUR&to=UGX,USD,...`
Rates stored in `exchange_rates` table, refreshed daily by GitHub Actions cron.

Conversion: `amountInDefault = amount * rate(accountCurrency → defaultCurrency)`

For UGX which isn't a major ECB rate pair, use two-hop via EUR or USD if a direct rate isn't available. Store the result of the two-hop computation as a synthetic rate in `exchange_rates`. If no rate is found, fall back to `1:1` and flag in the UI with a warning icon — never crash.

### Transfer transactions
Single DB row: `type='transfer'`, `accountId`=source, `toAccountId`=destination. The balance query handles it correctly. No paired rows needed.

Display: neutral color `var(--transfer)`, show `AccountA → AccountB` with an arrow.

### Recurring rules — GitHub Actions cron

```yaml
# .github/workflows/daily-cron.yml
name: Daily Cron
on:
  schedule:
    - cron: '5 0 * * *'   # 00:05 UTC daily
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger recurring rules processor
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/process-recurring \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

The API route at `/api/cron/process-recurring` checks `Authorization: Bearer <CRON_SECRET>` before processing. It also refreshes exchange rates from Frankfurter API in the same job.

Processing loop:
1. Fetch all `recurringRules` where `nextDueDate <= today` and `isActive = true`
2. `autoConfirm = true` → create transaction directly
3. `autoConfirm = false` → create a notification
4. Advance `nextDueDate` using `date-fns` (`addDays`, `addWeeks`, `addMonths`, etc.)
5. If `endDate` is set and new `nextDueDate > endDate` → set `isActive = false`

### Budget progress calculation
```
1. Determine period start/end from budget.period and today
2. Query transactions WHERE type='expense' AND categoryId IN budget.categories
   AND date BETWEEN start AND end AND accountId IN filter (if set)
3. Convert each to budget.currency using exchange rates
4. spent = SUM; percentage = (spent / budget.amount) * 100
5. status: < 75% = ok, 75–100% = warning, > 100% = exceeded
```

### Automatic rules engine
Applied in `POST /api/transactions` before DB write:

```typescript
for (const rule of rules.sort((a, b) => a.sortOrder - b.sortOrder)) {
  if (matchesCondition(rule, transaction)) {
    transaction = applyAction(rule, transaction);
  }
}
```

### API route security pattern
Every route must follow this pattern — no exceptions:

```typescript
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Always filter by userId — never trust client-provided IDs
const record = await prisma.someTable.findFirst({
  where: { id: params.id, userId: session.user.id },
});
if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
// Return 404 (not 403) even if record exists but belongs to another user
```

### Default categories (seeded on registration)

**Expense:** Food & Dining, Transport, Shopping, Housing & Rent, Utilities, Healthcare, Education, Entertainment, Personal Care, Travel, Gifts & Donations, Business Expenses, Fees & Charges, Other

**Income:** Salary, Freelance, Business Income, Investment Returns, Gifts Received, Other Income

Seed with distinct emoji icons and hex colors. Mark `isDefault: true`.

---

## MVP Scope

### In MVP
- User registration + login
- Account management
- Add / edit / delete transactions (income, expense, transfer)
- Categories (seeded defaults)
- Labels
- Dashboard: account cards, last records, balance trend, expenses donut, cash flow
- Records list with search
- Statistics: totals + category breakdown
- Budgets (monthly)
- Planned payments / recurring rules
- Settings: general, accounts, categories, labels
- Multi-currency with manual rates
- CSV export
- Dark theme
- Mobile-responsive layout
- PWA (offline support)
- Vercel deployment

### Post-MVP (in priority order)
| Feature | Priority |
|---|---|
| CSV import (migrate from Wallet by BudgetBakers) | High |
| Automatic exchange rate refresh (Frankfurter API cron) | High |
| Automatic rules engine | Medium |
| Templates | Medium |
| Top Expenses dashboard widget | Medium |
| Label report in Statistics | Medium |
| Budget rollover | Medium |
| OAuth login (Google) | Low |
| Widget reordering (drag) | Low |
| Browser push notifications | Low |
| Investments section | Low |
| Receipt image upload | Low |
| Light theme | Low |
| Subcategories | Low |
| Credit card / loan tracking | Low |
| Active sessions management | Low |

---

## Recommended Build Order

1. **Scaffold**: `npx create-next-app@latest nautilus --typescript --tailwind --app`, install all deps, setup `globals.css` with CSS custom properties
2. **Design system**: Configure Tailwind to use CSS variables, set up fonts (Space Grotesk + JetBrains Mono), build `BottomNav`, `TopBar`, `AmountDisplay`, `SkeletonBar` components
3. **Database**: Write `prisma/schema.prisma`, run first migration, write `seed.ts`
4. **Auth**: Configure NextAuth (`credentials` provider + bcryptjs), build login + register pages
5. **Accounts CRUD**: API routes + settings pages + `AccountCard` component
6. **Categories**: API routes + seed on registration + settings page
7. **Transactions**: `TransactionSheet` + `TransactionForm` + API routes (income/expense/transfer)
8. **Dashboard — data layer**: `/api/dashboard` route computing balances and last records
9. **Dashboard — UI**: `AccountCardRow`, `LastRecordsList`, static widget layout
10. **Records list**: Paginated list with date grouping and search
11. **Charts**: `BalanceTrendChart`, `ExpensesDonutChart`, `CashFlowChart` with Recharts custom theme
12. **Statistics**: Period selector + overview cards + category breakdown
13. **Budgets**: CRUD + progress calculation + `BudgetCard`
14. **Planned payments**: CRUD + GitHub Actions cron setup
15. **Labels**: CRUD + apply to transactions + label filter in records
16. **Settings pages**: General, currency, security, data export
17. **Offline / PWA**: Install `next-pwa`, configure Workbox, add Dexie local DB, implement sync layer, add `SyncIndicator`
18. **Polish**: Empty states, loading skeletons, error boundaries, toast notifications, PWA manifest + icons

---

## Environment Variables

```bash
# .env.example

# Neon PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host.neon.tech/nautilus?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"     # production: your Vercel URL
NEXTAUTH_SECRET=""                        # generate: openssl rand -base64 32

# GitHub Actions cron authentication
CRON_SECRET=""                            # generate: openssl rand -base64 32

# Set in GitHub Actions secrets:
# APP_URL = https://your-app.vercel.app
# CRON_SECRET = (same value as above)
```

---

## Naming Conventions

- Component files: `PascalCase.tsx`
- Utility + hook files: `camelCase.ts`
- API routes: `kebab-case` URL segments
- Database tables: `snake_case` (Prisma maps to camelCase in the generated client)
- Constants: `UPPER_SNAKE_CASE`
- CSS: Tailwind utilities only. Custom class names only for rare CSS variable references. No `styles/` CSS modules.
