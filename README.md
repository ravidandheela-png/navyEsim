# NavyeSIM

An eSIM reseller platform that aggregates packages from multiple vendors, always shows the cheapest price to customers in INR, and gives admin full control over vendors, pricing, margins, and orders.

---

## 1. Project Overview

NavyeSIM (navyesim.com) is a full-stack web application:
- **Backend**: Node.js + Express + PostgreSQL + Prisma ORM
- **Frontend**: Plain HTML + CSS + Vanilla JS (single `index.html`, no framework)
- **Admin Panel**: React + Vite + Tailwind CSS (CDN)
- **Auth**: JWT (admin only)

---

## 2. Local Setup

### Backend
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npx prisma migrate dev      # run migrations
node prisma/seed.js         # seed demo data
node server.js              # start on port 3000
```

### Admin Panel
```bash
cd admin
npm install
npm run dev                 # starts on http://localhost:5173
```

### Customer Frontend
Open `frontend/index.html` directly in a browser, or serve via any static server.

---

## 3. Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Express server port (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing admin JWTs (24h expiry) |
| `ADMIN_EMAIL` | Initial admin email |
| `ADMIN_PASSWORD_INITIAL` | Initial admin password (hashed on seed) |
| `VENDOR_API_KEY_ENCRYPTION_SECRET` | 32-char key for AES-256 vendor API key encryption |
| `PAYMENT_WEBHOOK_SECRET` | Validates incoming payment webhook requests |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `EXCHANGE_RATE_API_URL` | Frankfurter API base URL |
| `EXCHANGE_RATE_CRON` | Cron schedule for rate refresh (default: every 6h) |
| `EXCHANGE_RATE_BUFFER_PERCENT` | Safety buffer added to fetched rates |
| `SYNC_CRON_ENABLED` | Enable/disable automatic vendor sync |
| `UPLOAD_MAX_SIZE_MB` | Max file size for sheet uploads |
| `UPLOAD_DIR` | Directory for uploaded vendor sheets |

---

## 4. API Endpoint Reference

### Public
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/countries` | Active countries (id, name, isoCode, flagEmoji) |
| GET | `/api/packages?countryId=X` | Active canonical packages for country |
| GET | `/api/settings/payment` | UPI ID, QR string, Google Pay merchant ID |
| POST | `/api/orders` | Create order (returns orderId) |
| GET | `/api/orders/:id` | Poll order status (paymentStatus, esimQrData) |
| POST | `/api/payments/webhook` | Payment webhook stub |

### Admin (JWT required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Get JWT token |
| GET | `/api/admin/dashboard` | Stats + last 10 orders |
| CRUD | `/api/admin/countries` | Manage countries |
| CRUD | `/api/admin/vendors` | Manage vendors |
| POST | `/api/admin/vendors/:id/sync` | Trigger manual sync |
| POST | `/api/admin/vendors/:id/upload` | Upload CSV/XLSX sheet |
| CRUD | `/api/admin/packages` | Manage canonical packages |
| CRUD | `/api/admin/margin-rules` | Manage margin rules |
| GET | `/api/admin/orders` | List orders with filters |
| GET/PUT | `/api/admin/settings` | Platform settings |
| GET | `/api/admin/settings/exchange-rates` | Exchange rates |

---

## 5. How the Pricing Engine Works

1. **Vendor Sync**: Adapters fetch packages from vendor APIs or sheet uploads
2. **Normalization**: All vendor data mapped to `VendorPackage` schema
3. **Exchange Rate Conversion**: `originalPrice × exchangeRate = convertedPriceINR`
4. **Auto-Matching**: Vendor packages grouped into `CanonicalPackage` by (country, dataGB, durationDays)
5. **Cheapest Selection**: `MIN(convertedPriceINR)` across active, non-disabled vendor links
6. **Margin Engine**: Applies best matching `MarginRule` (package_specific → price_range → global)
7. **Rounding**: `none` | `round_up_9` | `ceil_hundred`
8. **Final Price**: Stored as `finalPriceINR` on `CanonicalPackage` — this is what customers see
9. **Price History**: Every price change logged to `PriceHistory` with reason

---

## 6. Adding a New Vendor

1. Go to Admin → Vendors → Add Vendor
2. Set name, slug, source type (API / Sheet / Both)
3. For API vendors: enter Base URL, API Key, Auth type
4. For sheet vendors: configure column mapping JSON
5. Click "Test Connection" to verify
6. Set sync frequency (0 = manual only)
7. Implement adapter in `backend/vendors/adapters/<slug>.js` (see `generic.js` as template)
8. Register adapter in `backend/vendors/index.js`

---

## 7. Adding a New Margin Rule

1. Go to Admin → Margin Rules → Add Rule
2. Choose rule type: Price Range | Specific Package | Global Fallback
3. Set conditions, margin %, and rounding rule
4. Use "Live Preview" to verify calculation
5. Click "Preview Impact" to dry-run against all packages before saving

---

## 8. Sheet Upload Format

Upload a CSV or XLSX file with columns matching your vendor's format.
Configure the column mapping in Admin → Vendors → Edit → Column Mapping:

```json
{
  "vendorPackageId": "Package ID",
  "vendorCountryCode": "Country",
  "name": "Package Name",
  "dataGB": "Data (GB)",
  "durationDays": "Validity (Days)",
  "originalPrice": "Price",
  "originalCurrency": "Currency"
}
```

---

## 9. TODO[INTEGRATION] Checklist

- [ ] Airalo API adapter (`backend/vendors/adapters/airalo.js`)
- [ ] eSIM Access API adapter (`backend/vendors/adapters/esimaccess.js`)
- [ ] Trip.com API adapter (`backend/vendors/adapters/tripdotcom.js`)
- [ ] Google Pay JS SDK (`frontend/index.html` Step 3)
- [ ] Razorpay / PhonePe payment gateway
- [ ] Real payment webhook with signature verification (`backend/routes/payments.js`)
- [ ] Automatic eSIM QR delivery from vendor API
- [ ] Customer email/WhatsApp notification on eSIM delivery
- [ ] Live exchange rate buffer auto-tuning
