# Data Hub / VTU Platform – Full Product & Technical Specification

## 1. Project Overview

This document defines the **complete UI/UX, frontend structure, backend API routes, and data flow** for a Ghana-based **Data Hub (VTU Platform)** that sells internet data bundles for:

- **MTN**
- **Telecel (Vodafone)**
- **AirtelTigo**

### Tech Stack
- **Backend:** Laravel (API-first)
- **Frontend:** React (existing starter kit, heavily modified)
- **Database:** MySQL
- **Authentication:** Starter kit auth (login/signup)
- **Payments:** Mobile Money (MTN, Telecel, AirtelTigo)
- **Data Delivery:** Licensed Vendor / VTU API

The starter kit already includes authentication, dashboard layout, and sidebar navigation. These must be **redesigned and repurposed**, not rebuilt.

---

## 2. User Roles

### 2.1 Regular User
- Fund wallet
- Buy data bundles
- View transaction history

### 2.2 Agent (Optional, Future)
- Discounted pricing
- Higher transaction limits

### 2.3 Admin
- Manage data packages
- Set pricing & markup
- Manage users
- View profits
- Monitor vendor balance
- View transaction & vendor logs

---

## 3. Global UI / UX Guidelines

- Clean fintech-style design
- Mobile-first
- Fast and minimal UI
- Clear success/error states
- Consistent spacing and typography

### Brand Colors
- **MTN:** Yellow
- **Telecel:** Red
- **AirtelTigo:** Red / Blue

---

## 4. Application Pages & UI Descriptions

---

## 4.1 Authentication Pages (OTP-Based, Phone Number Only)

Authentication must be **phone-number-only using OTP**, removing email and password entirely to keep the app simple and familiar for Ghanaian users.

This replaces the starter kit’s default email/password authentication logic.

---

### Unified Login / Signup Flow

**Concept**
- Login and signup are the **same flow**
- If phone number does not exist → create user automatically
- If phone number exists → log user in

---

### Step 1: Enter Phone Number

**UI Elements**
- App logo
- Headline: “Enter your phone number”
- Phone number input (auto country code: +233)
- Network auto-detection (MTN / Telecel / AirtelTigo)
- Continue button

**Behavior**
- Validate Ghana phone number
- Generate OTP
- Send OTP via SMS provider

---

### Step 2: OTP Verification

**UI Elements**
- OTP input (4–6 digits)
- Countdown timer (e.g. 60 seconds)
- Resend OTP button (rate-limited)

**Behavior**
- Verify OTP
- If user does not exist → create user & wallet (0.00 balance)
- Log user in immediately
- Redirect to Dashboard

---

### Security Rules
- OTP expires after configurable duration (e.g. 5 minutes)
- Limit OTP resend attempts
- Rate-limit phone submissions

---

## 4.2 Dashboard (Home)


**Purpose:** High-level account overview

**UI Components**
- Wallet Balance Card (prominent)
- Total Data Purchased
- Total Transactions
- Recent Transactions (last 5)
- “Fund Wallet” CTA button

---

## 4.3 Buy Data Page (Core Feature)

### Step 1: Select Network
**UI**
- 3 clickable cards:
  - MTN
  - Telecel
  - AirtelTigo
- Logo + brand color

---

### Step 2: Select Data Package
**UI**
- Grid or list of packages
- Each package card shows:
  - Data size
  - Price
  - Validity

Packages fetched dynamically from backend

---

### Step 3: Enter Phone Number
**UI**
- Phone input field
- Network auto-detection
- Warning on mismatch

---

### Step 4: Confirm Purchase
**UI**
- Summary card:
  - Network
  - Package
  - Phone number
  - Price
  - Wallet balance after deduction

CTA: **Confirm Purchase**

---

### Step 5: Processing State
- Loading indicator
- “Processing your request…”

Backend actions:
- Wallet deduction
- Vendor API call
- Transaction logging

---

### Step 6: Result State

**Success UI**
- Success icon
- Transaction reference
- “Data sent successfully”

**Failure UI**
- Error message
- Wallet auto-refund

---

## 4.4 Data Packages Page

**Purpose:** Browse packages without purchase

**UI**
- Filter by network
- Read-only prices
- Cards or table layout

---

## 4.5 Wallet Page

### Wallet Overview
- Current balance
- Total funded
- Total spent

### Fund Wallet Flow
**UI**
- Amount input
- Payment method selection:
  - MTN MoMo
  - Telecel Cash
  - AirtelTigo Money

**Behavior**
- Redirect to payment gateway
- Wallet credited via webhook ONLY

---

## 4.6 Transaction History Page

**UI**
- Table layout
- Filters:
  - Success
  - Failed
  - Pending

**Columns**
- Network
- Package
- Phone
- Amount
- Status
- Date

---

## 4.7 Profile Page

**UI**
- Update name
- Update phone
- Change password

---

## 4.8 Admin Panel

### Admin Dashboard
- Total users
- Total revenue
- Total profit
- Vendor balance alerts

### Manage Data Packages
- Add / edit packages
- Enable / disable packages
- Set markup per network

### Manage Users
- View users
- Suspend users
- Promote to agent

### Transactions & Logs
- Full transaction list
- Vendor API logs
- Manual refund option

---

## 5. Frontend Component Structure (Module-Based)

```text
src/
 ├── modules/
 │   ├── auth/
 │   │   ├── Login.tsx
 │   │   ├── Register.tsx
 │   │   └── authService.ts
 │   ├── dashboard/
 │   │   ├── Dashboard.tsx
 │   │   └── components/
 │   │       ├── WalletCard.tsx
 │   │       ├── StatsCard.tsx
 │   │       └── RecentTransactions.tsx
 │   ├── buy-data/
 │   │   ├── BuyData.tsx
 │   │   ├── components/
 │   │   │   ├── NetworkSelector.tsx
 │   │   │   ├── PackageList.tsx
 │   │   │   ├── PhoneInput.tsx
 │   │   │   ├── ConfirmModal.tsx
 │   │   │   └── ResultModal.tsx
 │   │   └── buyDataService.ts
 │   ├── packages/
 │   │   ├── Packages.tsx
 │   │   └── packagesService.ts
 │   ├── wallet/
 │   │   ├── Wallet.tsx
 │   │   ├── FundWallet.tsx
 │   │   └── walletService.ts
 │   ├── transactions/
 │   │   ├── Transactions.tsx
 │   │   └── transactionsService.ts
 │   ├── profile/
 │   │   ├── Profile.tsx
 │   │   └── profileService.ts
 │   ├── admin/
 │   │   ├── AdminDashboard.tsx
 │   │   ├── Users.tsx
 │   │   ├── Packages.tsx
 │   │   ├── Transactions.tsx
 │   │   └── adminService.ts
 │   └── shared/
 │       ├── components/
 │       │   ├── Button.tsx
 │       │   ├── Modal.tsx
 │       │   └── Loader.tsx
 │       └── api.ts
```

---

## 6. Backend API Routes (Laravel)

### Authentication
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
```

---

### Wallet
```
GET    /api/wallet
POST   /api/wallet/fund
POST   /api/wallet/webhook
```

---

### Data Packages
```
GET    /api/packages
GET    /api/packages/{network}
```

---

### Buy Data
```
POST   /api/data/purchase
```

---

### Transactions
```
GET    /api/transactions
GET    /api/transactions/{id}
```

---

### Admin Routes (Protected)
```
GET    /api/admin/dashboard
GET    /api/admin/users
PATCH  /api/admin/users/{id}
POST   /api/admin/packages
PATCH  /api/admin/packages/{id}
GET    /api/admin/transactions
GET    /api/admin/vendor-logs
```

---

## 7. Backend Logic Notes

- Wallet deductions must be atomic
- Lock wallet row during purchase
- Auto-refund on vendor failure
- Unique transaction reference IDs
- Log all vendor responses

---

## 8. End Goal

A secure, scalable, legally compliant **VTU / Data Hub platform** that can later expand into:
- Airtime sales
- Bill payments
- Agent networks
- Mobile app (Flutter)

---

**This document is the single source of truth for development.**

