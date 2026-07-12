# AssetFlow 🚀

AssetFlow is an enterprise-grade Asset & Resource Management System designed to transition organizations away from fragile tracking spreadsheets and paper logs into a centralized dashboard. Built as a high-performance, multi-tenant workspace platform using **Node.js (Express)** and **MySQL**, it provides secure data isolation, resource conflict validation, comprehensive audit lifecycles, and deep analytics.

---

## 🏗️ Architectural Model: The Workspace Concept

AssetFlow mirrors the modern SaaS tenant architecture (similar to Google Cloud Console or Slack):
* **Global Accounts:** Users maintain a single global credential identity across the entire platform.
* **Independent Workspaces:** Within an account, users dynamically initialize completely separate Organizations.
* **IAM Isolation Bridge:** Data segregation is strictly maintained at the database layer via an `organization_id` context. Global users map to organizations via the `Organization_Members` mapping table—meaning a user can act as an `Admin` in one workspace and a base `Employee` in another.

---

## 👥 Roles & Permissions Matrix

No user can self-elevate permissions during registration. Users onboard into existing workspaces exclusively with the base `Employee` tier and must be manually promoted by workspace managers via the Organization Setup Directory.

| Role | Operational Scope & Context Responsibilities |
| :--- | :--- |
| **Org Owner** | Workspace Owner; manages platform tenancy, generates initial invitations, and inherits full Admin rights. |
| **Admin** | Master Data Architect; manages internal Departments, hierarchies, Asset Categories, custom JSON metadata rules, and employee workspace promotion/demotion. |
| **Asset Manager** | Tactical Inventory Control; registers new assets, handles allocations, approves transfers, maintenance requests, returns, condition checks, and resolves audit discrepancies. |
| **Department Head** | Team Resource Governor; views assets allocated to their target department, approves/rejects internal asset re-allocations, and places reservations on behalf of their department. |
| **Employee** | Everyday End-User; views personal asset dashboard tracking, books shared company resources, raises maintenance tickets, and requests return/transfer workflows. |

---

## 💻 Tech Stack & Directory Structure

### Backend Architecture
* **Runtime Engine:** Node.js (Asynchronous Event Loop)
* **Framework:** Express.js
* **Database Driver:** `mysql2/promise` (Connection Pooling & SSL Handshakes)
* **Database Infrastructure:** Cloud-hosted Aiven MySQL (`ssl-mode=REQUIRED`)

### Repository Blueprint
```text
├── config/
│   └── db.js          # Asynchronous MySQL2 connection pool with SSL setup
├── middleware/
│   ├── auth.js        # JWT parser & cryptographic verification gateway
│   └── tenant.js      # X-Organization-ID cross-matching validation interceptor
├── routes/
│   ├── auth.js        # Signup, login, and active token context endpoints
│   ├── assets.js      # State-locked asset allocation & tracking engines
│   ├── audit.js       # Dynamic 6-Phase Audit workflow pipeline logic
│   └── analytics.js   # Screen 9 high-density relational data aggregation queries
├── app.js             # Express core app config, global CORS handling, and routing mounts
├── package.json       # Node package configurations & project dependencies
└── .env               # Isolated environment configurations & credentials

# 🛡️ Critical Engineering Solutions & Edge Cases Covered

## 1. The Double-Allocation Logic Trap (Assets)

### Problem
Race conditions could allow two managers to concurrently execute checkout actions on the same piece of hardware, causing data corruption.

### Solution
**State Locking at the controller tier.**

Before writing an allocation record, the system validates the current state of the asset. If the asset status is anything other than **Available**, the allocation request is blocked and the user is redirected to the **Transfer Request** workflow instead.

---

## 2. Calendar Booking Overlap Detection (Shared Spaces)

### Problem
Simple equality checks cannot detect partially overlapping booking intervals for shared resources such as meeting rooms or vehicles.

### Solution
Before inserting a booking, the backend executes an overlap validation query:

```sql
SELECT *
FROM Bookings
WHERE asset_tag = :tag
  AND status != 'Cancelled'
  AND (
        start_time < :new_end_time
    AND end_time > :new_start_time
      );
```

If any conflicting bookings are found, the backend immediately returns a **400 Bad Request**, allowing the frontend scheduler to notify the user without creating duplicate reservations.

---

## 3. High-Density Analytics Calculations

### Division-by-Zero Protection

New workspaces may initially contain no assets or bookings.

Instead of allowing division-by-zero exceptions to crash analytics endpoints, all calculations safely default to **0.0%** until meaningful data exists.

### Peak Booking Heatmaps

Historical booking data (excluding cancelled bookings) is aggregated by:

- Day of the week (1–7)
- Hour of the day (0–23)

This dataset directly powers the frontend heatmap visualization components.

---

## 4. Database Exception Mitigation Strategies

### Foreign Key Deletion Protection

Instead of permanently deleting records that participate in historical relationships, the system uses status enums:

- **Active**
- **Inactive**

This preserves historical allocations and analytics while preventing foreign key constraint violations.

### Connection Pool Leak Prevention

Every route controller follows an explicit:

- `try`
- `catch`
- `finally`

pattern to guarantee that every database connection is released back to the pool:

```javascript
connection.release();
```

This prevents connection pool starvation during periods of heavy application traffic.

---

# 📋 Six-Phase Structured Audit Lifecycle

The application implements a complete compliance workflow instead of relying on single-step audit submissions.

## Phase 1 — Audit Creation

Administrators or Asset Managers:

- Create a new Audit Cycle
- Select the target department
- Configure audit dates
- Assign auditors
- Save the audit with **Draft** status

---

## Phase 2 — Asset Registration

Assigned auditors populate the audit checklist by:

- Adding individual asset tags
- Importing comma-separated asset tag lists

Every imported asset begins with a status of **Pending**.

---

## Phase 3 — Physical Audit Execution

Auditors inspect each listed asset and assign one of the following statuses:

- ✅ Verified
- ❌ Missing
- 🔧 Damaged

---

## Phase 4 — Discrepancy Resolution

Asset Managers review every reported discrepancy.

Each flagged item can be marked as:

- **Confirmed**
- **Dismissed**

---

## Phase 5 — Audit Closure

Once **no Pending items remain**, managers may close the audit cycle.

Closing the audit permanently locks the audit data and automatically performs transactional inventory updates.

### Automatic Status Transitions

| Audit Result | Inventory Status |
|--------------|------------------|
| Confirmed Missing | Lost |
| Confirmed Damaged | Under Repair |

---

## Phase 6 — Historical Archiving

Closed audit cycles become:

- Read-only
- Permanently archived
- Hidden from standard employee views

This preserves historical compliance records while protecting production workspace integrity.

---

# 🚀 Environment Setup & Installation

## Clone the Repository

```bash
git clone <repository-url>
cd Asset-flow
```

---

## Install Dependencies

```bash
npm install
```

---



## Start the Development Server

```bash
npm run dev
```
