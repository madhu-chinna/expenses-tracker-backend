# Expenses Tracking Backend

A Node.js/Express backend with SQLite database for tracking personal expenses.

## Features

- RESTful API for CRUD operations on expenses
- SQLite database with automatic table creation
- Category management with default categories
- Expense statistics and reporting
- CORS enabled for frontend integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Expenses

- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories

- `GET /api/categories` - Get all categories

### Statistics

- `GET /api/statistics` - Get expense statistics
- `GET /api/statistics?startDate=2024-01-01&endDate=2024-12-31` - Get statistics for date range

### Health Check

- `GET /api/health` - API health status

## Database Schema

### Expenses Table
- `id` (TEXT, PRIMARY KEY) - Unique identifier
- `description` (TEXT) - Expense description
- `amount` (REAL) - Expense amount
- `category` (TEXT) - Expense category
- `date` (TEXT) - Expense date
- `created_at` (DATETIME) - Creation timestamp

### Categories Table
- `id` (INTEGER, PRIMARY KEY) - Auto-increment ID
- `name` (TEXT, UNIQUE) - Category name
- `color` (TEXT) - Category color for UI

## Default Categories

The system comes with pre-configured categories:
- Food & Dining
- Transportation
- Shopping
- Entertainment
- Bills & Utilities
- Healthcare
- Education
- Other 