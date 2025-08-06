# Expenses Tracking Backend

A Node.js backend API for tracking personal expenses with user authentication and expense management.

## Features

- User registration and authentication with JWT
- CRUD operations for expenses
- Expense categorization
- Statistics and reporting
- In-memory storage (perfect for Render deployment)

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. The server will run on `http://localhost:3008`

### Render Deployment

1. **Build Command**: `npm install`
2. **Start Command**: `node server.js`
3. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=3008`
   - `JWT_SECRET=your-secret-key-here`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Expenses
- `GET /api/expenses` - Get all expenses (authenticated)
- `GET /api/expenses/:id` - Get specific expense (authenticated)
- `POST /api/expenses` - Create new expense (authenticated)
- `PUT /api/expenses/:id` - Update expense (authenticated)
- `DELETE /api/expenses/:id` - Delete expense (authenticated)

### Categories
- `GET /api/categories` - Get all categories

### Statistics
- `GET /api/statistics` - Get expense statistics (authenticated)

### Utilities
- `GET /api/health` - Health check
- `DELETE /api/cleanup/all` - Cleanup all data (for testing)

## Default Data

The application comes with:
- A demo user (username: `demo`, password: `password`)
- Sample expenses
- Pre-configured expense categories

## Notes

- **In-memory storage**: Data is stored in memory and will be reset on server restart
- **Perfect for Render**: No database dependencies, works seamlessly on Render
- **Development friendly**: Easy to test and deploy

## Testing

You can test the API using tools like Postman or curl:

```bash
# Health check
curl https://your-render-app.onrender.com/api/health

# Login
curl -X POST https://your-render-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"password"}'
``` 