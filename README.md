# 🛍️ E-Commerce Website (Node.js + SQLite)

## 📌 Project Overview
A full-stack **E-Commerce web platform** built entirely with **Node.js**, featuring user authentication, product management, and persistent storage using SQLite.

The project supports:
- User registration and login with encrypted passwords  
- Session-based authentication using JWT tokens  
- Product browsing, adding, editing, and deletion  
- Import/export of user data for backup and migration  

**Technologies Used**
- Frontend: HTML, CSS, JavaScript  
- Backend: Node.js (Express)  
- Database: SQLite  
- Authentication: JWT + bcrypt  

---

## 🗂️ Repository Structure

ASDWRK2GRP2/  
│  
├── WebPages/  
│ ├── html files  
│ ├── css/  
│ │ └── style.css  
│ ├── scripts/  
│ │ └── javascript helper scripts  
│ ├── images/  
│ │ └── any image files  
│ └── html files  
│  
├── backend/  
│ ├── api/  
│ │ ├── index.js - the main router which connects all other routers into it  
│ │ ├── sampleApi.js - holds the structure of what an api router should be  
│ │ └── other router files that isolated for specific functions  
│ ├── export/  
│ │ └── holds temp export files for the database  
│ ├── uploads/  
│ │ └── holds temp import files for the database  
│ ├── helpers/  
│ │ └── holds helper files for backend functions  
│ ├── mybudget.db - SQLite database file  
│ ├── schema.sql - Database schema definition  
│ ├── auth.js - holds the token related functions  
│ ├── db-init.js - holds database initialisation functions  
│ └── db.js - holds database related functions  
│  
├── .github/workflows  
│ ├── main_saniriser.yml  
│ └── code-test-and-lint.yml  
│  
├── tests/  
│ └── test files  
│  
├── run.js - has the server run code  
├── package.json  
├── package-lock.json  
├── .gitignore  
├── prettierrc  
├── azure-pipelines.yml  
├── esling.config.mjs  
├── jest.setup.js  
├── .env  
└── README.md  

## 👥 Contributors and Responsibilities

| Team Member | Responsibilities |
|--------------|------------------|
| **Ben** | Database, schema, router structure, user accounts, login, account settings, upload/download user data, logout, delete account, frontend structure, server logic, github setup, ci/cd workflows, azure web services |
| **Jackson** | Dashboard HTML, Income HTML, Budget HTML, Dashboard CSS, Inomce CSS, Budget CSS, Expense CSS, Header CSS, Income JS, Income_simple JS, Transactions JS |
| **Randy** | Expense HTML and Scripting, Budget Scripting, Expense Backend Scripting, Budget Backend Scripting |
| **Romnic** | Saving Goals (HTML/CSS/JS), Upcoming Payments (HTML/CSS/JS), backend API routers (`savingGoals.js`, `upcomingPayments.js`), DB queries & validation, status/filter UI, mark-paid/edit/delete flows, summary cards, Jest + Supertest API tests for both features, README updates |


## Setup instructions
### Prerequisites
- node 22
- npm

#### Step 1 Clone the Repository
```
git clone https://github.com/BenMack8413/ASDWRK2GRP2.git
```

#### Step 2 Install Dependencies
```
npm install
```

#### Step 3 Run the Server
```
npm run start
```

#### Step 4 Access the Website
```
http://localhost:3000
```

## External Resource 
| Resource | Usage | Availability |
|---|---|---|
| Azure App Services | Website deployment | Expires on 15/11/25|

## Runnig Tests 
Install Dev Dependencies
```
npm install --dev
```
run tests
```
npm test
```

## API Routes
all routes start with /api
Categories.js 
start with /categories (e.g. /api/categories)
| Route | Method | Description |
|---|---|---|
| /:budgetId | GET | Gets all categories for a budget |
| /:budgetId/type/:type | GET | Gets categories by type |
| / | POST | Create a new category |
| /:categoryId | PUT | Updates a category |
| /:categoryId | DELETE | Deletes a category |
| /:categoryId/stats | GET | Gets category usage statistics |

Chart.js 
starts with /charts
| Route | Method | Description |
|---|---|---|
| /expenses-by-category/:budgetId | GET | Gets totals per category |
| /expenses-by-tag/:budgetId/:tagId | GET | Gets totals filtered by tag |
| /configs/:budgetId | GET | Gets all chart configs for a budget |
| /configs | POST | Create new chart config |
| /configs/:configId | DELETE | Deletes a config |

expense.js 
starts with /expense
| Route | Method | Description |
|---|---|---|
| / | GET | Lists expenses |
| / | POST | Create new expense |
| /:id | DELETE | Delete expense |

importExport.js 
starts with /importExport
| Route | Method | Description |
|---|---|---|
| /export | GET | Exports user data to an sqlite file and downloads it to the users browser |
| /import | POST | Takes an sqlite file as input and replaces all data relating to the user in the database |

income.js 
starts with /income
| Route | Method | Description |
|---|---|---|
| / | GET | Gets all incomes for a budget |
| / | POST | Create new income |
| /:id | DELETE | Delete income |

settings.js 
starts with /settings
| Route | Method | Description |
|---|---|---|
| / | GET | Get settings for a user |
| / | POST | Update settings of a user |

transactions.js 
starts with /transactions
| Route | Method | Description |
|---|---|---|
| / | GET | Gets transactions for a specific budget |
| /:id | GET | Get transactuin by transaction id and budget id |
| / | POST | Create new transaction |

savingGoals.js  
starts with /saving-goals
| Route        | Method | Description                                  |
|--------------|--------|----------------------------------------------|
| /            | GET    | Get all saving goals for the current user    |
| /            | POST   | Create a new saving goal                     |
| /:id         | PUT    | Update an existing saving goal               |
| /:id         | DELETE | Delete a saving goal                         |

upcomingPayments.js  
starts with /upcoming-payments
| Route               | Method | Description                                             |
|---------------------|--------|---------------------------------------------------------|
| /                   | GET    | Get all upcoming payments for the current user         |
| /                   | POST   | Create a new upcoming payment                          |
| /:id                | PUT    | Update an existing upcoming payment                    |
| /:id                | DELETE | Delete a payment                                       |
| /:id/mark-paid      | PATCH  | Mark a payment as paid                                 |

User.js 
starts with /user
| Route | Method | Description |
|---|---|---|
| /signup | POST | Create new account in database |
| /login | POST | Create token for a user loggin in |
| /verify | GET | Verify token |
| /me | GET | Returns user |
| /information/:id | GET | Gets account information |
| /delete/id | DELETE | Deletes account |<img width="725" height="483" alt="Screenshot 2025-10-26 at 6 55 05 AM" src="https://github.com/user-attachments/assets/57588a23-612f-4442-81fd-162c70656565" />
