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
