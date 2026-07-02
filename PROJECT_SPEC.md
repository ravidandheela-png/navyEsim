
You are building a full-stack web application called NavyeSIM (navyesim.com).
This is an eSIM reseller platform that aggregates packages from multiple vendors,
always shows the cheapest price to customers in INR, and gives admin full control
over vendors, pricing, margins, and orders.

Read every section carefully before writing any code.
Follow the architecture exactly as described.

════════════════════════════════════════
1. TECH STACK
════════════════════════════════════════

Backend:    Node.js + Express
Database:   PostgreSQL + Prisma ORM
Frontend:   Plain HTML + CSS + Vanilla JS (single index.html, no framework)
Admin:      React + Vite + Tailwind CSS (CDN)
Auth:       JWT (admin only, customers need no login)
File upload: Multer
Sheet parse: xlsx library
Scheduler:  node-cron
Mailer:     Nodemailer (stubbed, TODO)

No frontend framework for customer page.
No heavy UI libraries anywhere.
Customer page must load under 2 seconds on Slow 3G (Chrome DevTools throttle).
Total customer page weight (excluding lazy QR lib): under 50KB.

════════════════════════════════════════
2. FOLDER STRUCTURE
════════════════════════════════════════

/navyesim
  /backend
    /routes
      customers.js       → country list, package list, order create/get
      orders.js          → order management
      payments.js        → payment webhook stub
      admin.js           → all admin routes (protected)
      settings.js        → exchange rates, payment config, markup rules
    /controllers         → business logic separated from routes
    /models              → Prisma schema models
    /middleware
      auth.js            → JWT verify middleware
      errorHandler.js    → global error handler
      upload.js          → multer config
    /vendors
      index.js           → vendor router, loads adapter by vendor.slug
      /adapters
        generic.js       → configurable adapter for standard REST APIs
        airalo.js        → Airalo-specific adapter (TODO[INTEGRATION])
        esimaccess.js    → eSIM Access adapter (TODO[INTEGRATION])
        tripdotcom.js    → Trip.com adapter (TODO[INTEGRATION])
      normalizer.js      → maps any vendor response to VendorPackage schema
      sheetParser.js     → parses CSV/XLSX to VendorPackage schema
    /pricing
      marginEngine.js    → applies margin rules, returns finalPriceINR
      matchEngine.js     → groups vendor packages into canonical packages
    /jobs
      syncVendors.js     → pulls packages from all active vendors
      matchPackages.js   → runs after sync, groups + finds cheapest
      exchangeRates.js   → fetches live rates from frankfurter.app
    /uploads
      /vendor-sheets     → uploaded CSV/XLSX files (timestamped filenames)
    /prisma
      schema.prisma
      seed.js
    server.js
    .env.example

  /frontend
    index.html           → entire customer app (HTML + CSS + JS inline)

  /admin
    /src
      /pages
        Dashboard.jsx
        Countries.jsx
        Packages.jsx
        Vendors.jsx
        VendorDetail.jsx
        MarginRules.jsx
        Orders.jsx
        Settings.jsx
        Login.jsx
      /components
        Sidebar.jsx
        Table.jsx
        Modal.jsx
        Badge.jsx
        LivePreview.jsx
      App.jsx
      main.jsx
    vite.config.js
    index.html

  README.md
  .env.example

════════════════════════════════════════
3. DATABASE MODELS (Prisma)
════════════════════════════════════════

Country {
  id, name, isoCode, flagEmoji, isActive, createdAt
}

Vendor {
  id, name, slug, sourceType (api|sheet),
  apiBaseUrl, apiKey (AES-256 encrypted),
  apiAuthType (bearer|apikey_header|basic|query_param),
  apiAuthHeaderName,
  columnMappingJson,        // for sheet vendors: JSON field map config
  syncFrequencyHours,       // 0 = manual only
  isActive, lastSyncedAt,
  syncStatus (idle|syncing|success|error),
  syncErrorMessage, createdAt
}

VendorPackage {
  id, vendorId, countryId,
  vendorPackageId,          // vendor's own ID for this package
  vendorCountryCode,        // raw country value from vendor before mapping
  name, dataGB, durationDays,
  originalPrice,            // price in vendor's currency
  originalCurrency,         // "USD", "HKD", "EUR" etc.
  convertedPriceINR,        // originalPrice × exchange rate at sync time
  rawPayload,               // full vendor response stored as JSON string
  isActive, isMapped,
  sourceFile,               // filename if from sheet upload, null if API
  lastSeenAt, createdAt, updatedAt
}

CanonicalPackage {
  id, countryId, name,
  dataGB, durationDays,
  winningVendorPriceINR,    // cheapest vendor price in INR
  marginRuleId,             // which rule was applied
  marginPercent,            // margin % applied
  marginAmountINR,          // profit in INR (admin only, never sent to customer)
  finalPriceINR,            // computed customer price
  manualPriceOverride,      // boolean
  manualPriceINR,           // if override active, use this
  manualOverrideReason,
  badge,                    // optional admin label: "Best Value", "Popular" etc.
  isActive, sortOrder, createdAt, updatedAt
}

CanonicalPackageVendorLink {
  id, canonicalPackageId, vendorPackageId,
  vendorPriceINR,           // convertedPriceINR at time of link
  isCheapest,               // recomputed every sync
  isDisabledByAdmin,        // admin can exclude a vendor from competing
  lastCheckedAt
}

MarginRule {
  id, name, priority,
  ruleType (price_range|package_specific|global),
  priceMinINR, priceMaxINR,
  canonicalPackageId,       // only for package_specific rules
  marginPercent,
  roundingRule (none|round_up_9|ceil_hundred),
  isActive, createdAt
}

Order {
  id, canonicalPackageId,
  customerEmail,            // optional
  paymentMethod (googlepay|upi|qr),
  paymentStatus (pending|paid|failed),
  paymentReference,
  esimQrData,               // eSIM QR string, set after payment confirmed
  totalINR,                 // final price charged
  createdAt
}

ExchangeRate {
  id, fromCurrency, toINR,
  source (frankfurter|manual),
  isPinned,                 // if true, auto-sync will NOT overwrite
  fetchedAt, appliedAt,
  updatedBy (auto_cron|admin_manual)
}

PriceHistory {
  id, canonicalPackageId,
  oldPriceINR, newPriceINR,
  vendorPriceINR, exchangeRateUsed,
  marginRuleId, marginPercent, marginAmountINR,
  wasManualOverride, overrideReason,
  reason,                   // "sync" | "exchange_rate_update" | "rule_change" | "manual"
  triggeredBy, createdAt
}

SyncLog {
  id, vendorId,
  startedAt, finishedAt,
  packagesAdded, packagesUpdated,
  packagesStale, packagesUnmapped,
  errorCount, errorDetails,
  status (success|partial|failed)
}

Admin {
  id, email, passwordHash, createdAt
}

════════════════════════════════════════
4. CUSTOMER FRONTEND (index.html)
════════════════════════════════════════

Single HTML file. All CSS and JS inline. Zero external resources on initial load.
qrcode.js loaded from CDN lazily only when eSIM QR needs to be shown.
System font stack only — no Google Fonts.

Design:
  Background:   #FFFFFF
  Card bg:      #F5F5F5
  Text:         #1A1A1A
  Accent/CTA:   #1B3A6B  (navy, matches brand name)
  Font:         system-ui, -apple-system, sans-serif
  Border radius: 8px cards, 6px buttons
  Shadow:       0 1px 4px rgba(0,0,0,0.08) on cards only
  Max width:    480px centered, mobile-first

── STEP 1: Country Selection ──
On load:
  - Fetch GET /api/countries → cache in sessionStorage for 60 minutes.
  - Request browser geolocation.
  - If granted: match coords to isoCode from cached list (no external geocode API).
    Show: "You're in 🇩🇪 Germany — get an eSIM here?" + YES button +
    "Search another country" link.
  - If denied or no match: show search input immediately.
 
Search input:
  - Filters cached country list client-side. Zero API calls per keystroke.
  - Shows dropdown of max 5 results: flag emoji + country name.
  - Tap to select.

── STEP 2: Package Selection ──
  - Fetch GET /api/packages?countryId=X once on country confirm.
  - Two tabs: "By Data" | "By Duration" — filter/sort client-side.
  - Show CSS skeleton loader while fetching.
  - Package card: name, data, duration, ₹ price. One "Select" button.
  - On select: highlight card + show sticky footer:
    "[Package name] · ₹X · Continue →"

── STEP 3: Payment ──
  - POST /api/orders → get orderId back.
  - Show:
    a) Google Pay button (stub — TODO[INTEGRATION]: Google Pay JS SDK)
    b) UPI QR: fetch merchant QR string from
       GET /api/settings/payment (public endpoint) and display it.
    c) "Pay via UPI ID" text with UPI ID from settings.
  - Poll GET /api/orders/:id every 3 seconds, max 20 attempts.
  - On paymentStatus = "paid": lazy-load qrcode.js, render eSIM QR.
  - Show: large QR code + 3-line activation instructions +
    Share button (navigator.share() with clipboard fallback) +
    "Take a screenshot to save your eSIM" tip.

Error handling:
  - All API failures show plain-language messages, never raw errors.
  - Network offline: "You're offline. Please check your connection."
  - Polling timeout: "Payment is taking longer than expected.
    Check your email or contact support."

════════════════════════════════════════
5. BACKEND API ENDPOINTS
════════════════════════════════════════

── Public (no auth) ──
GET  /api/countries
  → active countries only: id, name, isoCode, flagEmoji

GET  /api/packages?countryId=X
  → active canonical packages for country:
    id, name, dataGB, durationDays, priceINR, badge
  → NEVER include vendor prices, margins, vendor IDs

GET  /api/settings/payment
  → { upiId, upiQrString, googlePayMerchantId }

POST /api/orders
  → body: { canonicalPackageId, paymentMethod, customerEmail? }
  → creates Order with status=pending
  → returns { orderId }

GET  /api/orders/:id
  → returns { paymentStatus, esimQrData (null until paid) }
  → NEVER returns pricing internals

POST /api/payments/webhook
  → stub: validates secret header, marks order as paid
  → TODO[INTEGRATION]: add provider signature verification
  → on paid: log, update order, trigger eSIM fulfillment stub

── Admin (JWT required on all routes) ──
POST   /api/admin/login
GET    /api/admin/dashboard
         → { totalOrders, paidOrders, revenueINR,
             activeCountries, activePackages, last10Orders }

CRUD   /api/admin/countries
CRUD   /api/admin/vendors
POST   /api/admin/vendors/:id/sync       → trigger manual sync
POST   /api/admin/vendors/:id/upload     → upload CSV/XLSX sheet
GET    /api/admin/vendors/:id/synclogs   → last 20 sync logs

CRUD   /api/admin/packages               → manage canonical packages
GET    /api/admin/packages/unmatched     → vendor packages not yet matched
POST   /api/admin/packages/rematch       → re-run auto-matcher
POST   /api/admin/packages/reprice       → re-run margin engine only
PUT    /api/admin/packages/:id/price     → manual override or clear override
PUT    /api/admin/packages/:id/vendor-link/:linkId → enable/disable a vendor link

CRUD   /api/admin/margin-rules
POST   /api/admin/margin-rules/preview   → dry-run rules on all packages,
                                           return table of affected prices

GET    /api/admin/orders                 → filter by status, country, date range
GET    /api/admin/orders/:id
PUT    /api/admin/orders/:id            → manual status update, paste esimQrData

GET    /api/admin/settings
PUT    /api/admin/settings              → UPI ID, UPI QR string, Google Pay ID,
                                          eSIM fulfillment mode
GET    /api/admin/settings/exchange-rates
PUT    /api/admin/settings/exchange-rates/:currency  → manual rate or pin toggle
POST   /api/admin/settings/exchange-rates/refresh    → fetch live rates now
POST   /api/admin/settings/reconvert                 → recompute all INR prices

GET    /api/admin/price-history/:canonicalPackageId

════════════════════════════════════════
6. VENDOR SYSTEM
════════════════════════════════════════

Each adapter exports:
  fetchPackages()         → returns normalized VendorPackage array
  testConnection()        → returns { ok: bool, message: string }
  fetchPackageDetail(id)  → optional, returns single package

generic.js adapter reads all config (baseUrl, auth, field mappings)
from DB so simple vendors need zero code changes — just admin config.

Adapter files scaffold with full TODO[INTEGRATION] comments showing
exactly where to insert each vendor's real API calls.

Sheet upload flow:
  1. Admin uploads CSV or XLSX for a vendor
  2. Multer saves to /uploads/vendor-sheets/<vendorSlug>_<timestamp>.<ext>
  3. sheetParser reads column mapping config from vendor.columnMappingJson
  4. Parses rows → normalizes to VendorPackage schema
  5. Same upsert + auto-match flow as API sync
  6. Returns { parsed, added, updated, unmapped, errors }
  7. Keep last 10 files per vendor, list in admin with download links

════════════════════════════════════════
7. PRICE ENGINE
════════════════════════════════════════

── Exchange Rates ──
Source: https://api.frankfurter.app/latest?from=USD&to=INR,HKD,EUR,GBP,SGD,AED,JPY,AUD,CAD
Cron: every 6 hours (configurable via EXCHANGE_RATE_CRON env var)
After fetch:
  1. Update non-pinned ExchangeRate rows
  2. Recompute convertedPriceINR for all VendorPackages
  3. Re-run cheapest + margin engine
  4. Log price changes to PriceHistory with reason="exchange_rate_update"

Admin can:
  - Pin any currency rate (auto-sync skips pinned rates)
  - Add optional buffer %: fetched rate × (1 + buffer/100)
    e.g. buffer=1 means USD ₹83.50 → stored as ₹84.34
  - "Refresh Now" button triggers immediate fetch + reprice
  - Warning banner if any rate older than 12h (yellow) or 24h (red)

── Cheapest Vendor Selection ──
After every sync and rate update:
  Per CanonicalPackage:
    - Query all active vendor links
    - Find MIN(vendorPriceINR) where vendor.isActive
      AND vendorPackage.isActive AND link.isDisabledByAdmin=false
    - Set isCheapest=true on winner, false on rest
    - Store winningVendorPriceINR on CanonicalPackage

── Margin Engine ──
Default seeded rules (admin edits anytime):
  Priority 1: price_range   priceMaxINR=999      marginPercent=10
  Priority 2: price_range   priceMin=1000  max=1999  marginPercent=8
  Priority 3: price_range   priceMinINR=2000     marginPercent=7
  Priority 99: global fallback                   marginPercent=10

Rule evaluation order:
  1. package_specific rule for this canonicalPackageId → use if found
  2. price_range rules in priority order → first match wins
  3. global fallback

Compute:
  marginAmount = winningVendorPriceINR × (marginPercent / 100)
  rawFinal     = winningVendorPriceINR + marginAmount
  finalPriceINR = apply rounding rule

If manualPriceOverride=true → use manualPriceINR, skip all above
  (but still compute and store what the rule-based price would have been)

Rounding rules:
  none:          use rawFinal as-is
  round_up_9:    ₹1082 → ₹1089
  ceil_hundred:  ₹1082 → ₹1100

════════════════════════════════════════
8. ADMIN PANEL PAGES
════════════════════════════════════════

Design: clean, white, functional. Sidebar nav. Tailwind via CDN.
Consistent table/card/button styles. Responsive preferred but not critical.

── Dashboard ──
Stat cards: Total Orders | Paid Orders | Revenue (₹) |
            Active Countries | Active Packages
Last 10 orders table.
Exchange rate staleness warning banner (yellow >12h, red >24h).

── Countries ──
Table: Flag | Name | ISO Code | Active toggle | Edit | Delete
Add Country form: name, ISO code, flag emoji, active toggle.
Bulk enable/disable.

── Vendors ──
Table: Name | Type (API/Sheet) | Last Synced | Status badge |
       Total Pkgs | Active Pkgs | Sync Now | Edit | Delete

Add/Edit Vendor:
  - Name, Slug, Source type (API | Sheet | Both)
  - If API: Base URL, API Key (masked), Auth type, Header name,
    "Test Connection" button → shows { ok, message } inline
  - Column mapping config (field-by-field form for sheet vendors)
  - Sync frequency dropdown

Vendor Detail page:
  - Sync history: last 20 logs with timestamp, counts, errors
  - "Sync Now" with live status polling
  - "Upload Sheet" with file picker, progress bar, result summary
  - Uploaded files list with download links
  - Packages tab (see all VendorPackages from this vendor)

── Packages ──
Tabs: Canonical Packages | Unmatched Packages

Canonical Packages table:
  Country | Name | Data | Duration | Vendors |
  Best Vendor Price (₹, admin only) | Rule Applied |
  Final Price (₹) | Override badge | Active | Edit

Click package → Detail modal:
  Vendor comparison table:
    Vendor | Orig Price | Currency | Price (INR) | Cheapest badge | Disabled toggle
 
  Pricing breakdown:
    Cheapest vendor:    ₹XXX
    Rule applied:       "Below ₹1,000 → +10%"
    Margin amount:      ₹XX
    Raw final:          ₹XXX
    After rounding:     ₹XXX
    ──────────────────────────
    Customer sees:      ₹XXX

  Manual override section:
    Toggle → ₹ input + reason field + Save
    If active: "⚠ Manual override: ₹X" + Clear link
 
  Price history timeline: when price changed, why, old→new

Unmatched Packages tab:
  Table: Vendor | Country | Name | Data | Duration | Price
  Per row: "Create New Canonical" | "Link to Existing" dropdown
  "Auto-match All" button | Bulk "Create Canonical for Selected"

── Margin Rules ──
Drag-to-reorder priority list.
Each rule card: priority badge | condition summary | margin % |
                example calc | active toggle | edit | delete

Add/Edit Rule form:
  - Rule name
  - Type: Price Range | Specific Package | Global Fallback
  - Conditions based on type
  - Margin %
  - Rounding dropdown
  - Live preview: "Enter a vendor price: ₹[input]"
    → "Customer pays: ₹X | Your profit: ₹Y (Z%)" updates as you type

"Preview Impact" button:
  Dry-runs rule against all active packages.
  Shows table: Package | Vendor Price | Old Final | New Final | Diff
  No changes saved until admin confirms.

── Orders ──
Table: Order ID | Package | Country | ₹ Amount |
       Payment Method | Status badge | Date | Actions

Filters: status | country | date range
Click order → Detail modal:
  All fields + esimQrData paste field +
  "Mark as Paid" button + "Copy QR Data" button

── Settings ──
  Exchange Rates section:
    Table: Currency | Rate to ₹ | Source | Last Updated | Pinned toggle | Edit
    "Refresh Rates Now" button → shows result summary after fetch
    Buffer % field: adds safety margin to all fetched rates
   
  Payment Config:
    UPI ID | UPI QR String (paste merchant QR) | Google Pay Merchant ID
   
  eSIM Fulfillment:
    Mode toggle: Manual | Automatic (TODO[INTEGRATION])
   
  Admin Account:
    Change password form

════════════════════════════════════════
9. SECURITY
════════════════════════════════════════

- Vendor API keys encrypted at rest using AES-256
  key from VENDOR_API_KEY_ENCRYPTION_SECRET env var
- API keys never returned in GET responses — shown as "••••[last4]"
- Vendor API calls made backend-only, never proxied to frontend
- All admin routes protected by JWT middleware
- Rate limit sync endpoint to prevent spam
- Webhook endpoint validates secret header before processing
- Customer API responses NEVER include: vendor prices, margins,
  vendor IDs, exchange rates, rawPayload, or any internal data
- All vendor sync errors caught and logged — never crash the job

════════════════════════════════════════
10. ENV VARS (.env.example)
════════════════════════════════════════

PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/navyesim
JWT_SECRET=
ADMIN_EMAIL=admin@navyesim.com
ADMIN_PASSWORD_INITIAL=

VENDOR_API_KEY_ENCRYPTION_SECRET=   # 32 chars
PAYMENT_WEBHOOK_SECRET=
CORS_ALLOWED_ORIGINS=https://navyesim.com

EXCHANGE_RATE_API_URL=https://api.frankfurter.app
EXCHANGE_RATE_CRON=0 */6 * * *
EXCHANGE_RATE_BUFFER_PERCENT=0

SYNC_CRON_ENABLED=true
UPLOAD_MAX_SIZE_MB=10
UPLOAD_DIR=./uploads/vendor-sheets

════════════════════════════════════════
11. SEED DATA
════════════════════════════════════════

Run: node prisma/seed.js

Seeds:
- 1 admin user (email + hashed password from env)
- 10 countries with flag emojis and ISO codes
- 3 vendors: Airalo (api), eSIM Access (api), Sheet Vendor (sheet)
  all with dummy/placeholder API keys
- 5 canonical packages per country
- 3 vendor package rows per canonical package at different prices
  so cheapest-wins logic is immediately demonstrable
- 5 margin rules as defined in Section 7
- Exchange rates for: USD, EUR, HKD, GBP, SGD, AED
  with realistic INR values
- 1 price history entry per canonical package
- 2 sample orders (1 pending, 1 paid with dummy esimQrData)

════════════════════════════════════════
12. README SECTIONS
════════════════════════════════════════

1. Project Overview
2. Local Setup (backend + admin + frontend)
3. Environment Variables reference
4. API Endpoint reference table
5. How the Pricing Engine works (step by step)
6. Adding a New Vendor (step by step)
7. Adding a New Margin Rule
8. Sheet Upload format + column mapping guide
9. TODO[INTEGRATION] checklist — what to build next:
   □ Airalo API adapter
   □ eSIM Access API adapter
   □ Trip.com API adapter
   □ Google Pay JS SDK
   □ Razorpay / PhonePe payment gateway
   □ Real payment webhook with signature verification
   □ Automatic eSIM QR delivery from vendor API
   □ Customer email/WhatsApp notification on eSIM delivery
   □ Live exchange rate buffer auto-tuning

════════════════════════════════════════
13. CODING RULES FOR THE AGENT
════════════════════════════════════════

- Scaffold ALL files and folders listed in Section 2.
  No placeholders — every file must have real working code.
- Every external integration that is not yet available must have a
  TODO[INTEGRATION]: comment explaining exactly what to plug in.
- Customer index.html must be a single self-contained file.
  Test mentally against Slow 3G: interactive in under 2 seconds.
- Never expose internal pricing data in any customer-facing API response.
- Prisma schema must match Section 3 exactly.
- Seed script must run cleanly on first try with: node prisma/seed.js
- All vendor sync errors must be caught — never let one vendor
  failure crash the sync job for other vendors.
- Margin engine must always have a fallback rule —
  throw a clear error if no rule matches (should never happen with global rule).
- Price changes must always be logged to PriceHistory with a reason.
- Admin JWT must expire in 24 hours. Refresh token not required for MVP.
- All money values stored and computed in INR as integers (paise)
  internally to avoid float errors, converted to ₹ display only at
  API response layer.
- Write a short JSDoc comment on every exported function.
- Start with backend + database, then admin panel, then customer frontend.
  Confirm each layer works before moving to the next.