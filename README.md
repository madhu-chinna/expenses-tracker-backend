# Expenses Tracking Backend

A Node.js/Express.js backend for the Expenses Tracking System with in-memory data storage and file persistence.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Expense Management**: CRUD operations for expenses
- **Category Management**: Predefined expense categories
- **Statistics**: Expense statistics and analytics
- **Data Persistence**: Data is saved to JSON files and persists between server restarts
- **Demo User**: Pre-configured demo user for testing

## Data Persistence

The application now uses **file-based persistence** to save user and expense data to JSON files:

- **Users**: Stored in `data/users.json`
- **Expenses**: Stored in `data/expenses.json`
- **Automatic Loading**: Data is loaded from files when server starts
- **Automatic Saving**: Data is saved to files when modified

This ensures that:
- ✅ User registrations persist between server restarts
- ✅ Expense data is preserved
- ✅ Demo user is always available
- ✅ No database setup required

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Expenses
- `GET /api/expenses` - Get all expenses for current user
- `GET /api/expenses/:id` - Get specific expense
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - Get all categories

### Statistics
- `GET /api/statistics` - Get expense statistics

### Health & Debug
- `GET /api/health` - Health check
- `GET /api/debug/users` - View all users (development)
- `GET /api/debug/expenses` - View all expenses (development)

### Cleanup (Development)
- `DELETE /api/cleanup/all` - Reset all data to demo state
- `DELETE /api/cleanup/users` - Reset only users to demo state

## Demo User

A demo user is always available for testing:
- **Username**: `demo`
- **Password**: `password`

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

- `PORT` - Server port (default: 3008)
- `JWT_SECRET` - JWT secret key (default: 'your-secret-key-change-in-production')

## Deployment on Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Deploy

The application will automatically create the data directory and JSON files on first run.

## Data Files

The application creates these files in the `data/` directory:
- `users.json` - User data
- `expenses.json` - Expense data

These files are automatically created and managed by the application.

## Development Notes

- Data files are excluded from version control (see `.gitignore`)
- Debug endpoints are available for development but should be removed in production
- The demo user is always available for testing
- All data operations automatically save to files 