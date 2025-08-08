const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from files or use defaults
const loadData = (filePath, defaultValue) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return defaultValue;
};

// Save data to files
const saveData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
};

// Initialize data
let users = loadData(USERS_FILE, [
  {
    id: 'default-user',
    username: 'demo',
    email: 'demo@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
    created_at: new Date().toISOString()
  }
]);

let expenses = loadData(EXPENSES_FILE, [
  {
    id: '1',
    user_id: 'default-user',
    description: 'Grocery shopping',
    amount: 150.50,
    category: 'Food & Dining',
    date: '2024-01-15',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'default-user',
    description: 'Gas station',
    amount: 45.00,
    category: 'Transportation',
    date: '2024-01-14',
    created_at: new Date().toISOString()
  }
]);

let categories = [
  { id: 1, name: 'Food & Dining', color: '#28a745' },
  { id: 2, name: 'Transportation', color: '#007bff' },
  { id: 3, name: 'Shopping', color: '#ffc107' },
  { id: 4, name: 'Entertainment', color: '#dc3545' },
  { id: 5, name: 'Bills & Utilities', color: '#6f42c1' },
  { id: 6, name: 'Healthcare', color: '#fd7e14' },
  { id: 7, name: 'Education', color: '#20c997' },
  { id: 8, name: 'Other', color: '#6c757d' }
];

let nextExpenseId = Math.max(...expenses.map(e => parseInt(e.id)), 0) + 1;
let nextCategoryId = 9;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authentication Routes

// User registration
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = users.find(user => user.username === username || user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveData(USERS_FILE, users); // Save updated users

    // Generate JWT token
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, username, email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API Routes (Protected)

// Get all expenses for current user
app.get('/api/expenses', authenticateToken, (req, res) => {
  try {
    const userExpenses = expenses
      .filter(expense => expense.user_id === req.user.userId)
      .map(expense => {
        const category = categories.find(c => c.name === expense.category);
        return {
          ...expense,
          category_name: category ? category.name : expense.category,
          category_color: category ? category.color : '#6c757d'
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(userExpenses);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense by ID (for current user)
app.get('/api/expenses/:id', authenticateToken, (req, res) => {
  try {
    const expense = expenses.find(e => e.id === req.params.id && e.user_id === req.user.userId);
    
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    const category = categories.find(c => c.name === expense.category);
    const expenseWithCategory = {
      ...expense,
      category_name: category ? category.name : expense.category,
      category_color: category ? category.color : '#6c757d'
    };

    res.json(expenseWithCategory);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new expense (for current user)
app.post('/api/expenses', authenticateToken, (req, res) => {
  const { description, amount, category, date } = req.body;

  if (!description || !amount || !category || !date) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    const newExpense = {
      id: nextExpenseId.toString(),
      user_id: req.user.userId,
      description,
      amount: parseFloat(amount),
      category,
      date,
      created_at: new Date().toISOString()
    };

    expenses.push(newExpense);
    saveData(EXPENSES_FILE, expenses); // Save updated expenses
    nextExpenseId++;

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update expense (for current user)
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  const { description, amount, category, date } = req.body;
  const { id } = req.params;

  if (!description || !amount || !category || !date) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    const expenseIndex = expenses.findIndex(e => e.id === id && e.user_id === req.user.userId);
    
    if (expenseIndex === -1) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    expenses[expenseIndex] = {
      ...expenses[expenseIndex],
      description,
      amount: parseFloat(amount),
      category,
      date
    };

    saveData(EXPENSES_FILE, expenses); // Save updated expenses
    res.json(expenses[expenseIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense (for current user)
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  try {
    const expenseIndex = expenses.findIndex(e => e.id === id && e.user_id === req.user.userId);
    
    if (expenseIndex === -1) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    expenses.splice(expenseIndex, 1);
    saveData(EXPENSES_FILE, expenses); // Save updated expenses
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all categories (public)
app.get('/api/categories', (req, res) => {
  try {
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense statistics (for current user)
app.get('/api/statistics', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  
  try {
    let userExpenses = expenses.filter(expense => expense.user_id === req.user.userId);
    
    // Apply date filter if provided
    if (startDate && endDate) {
      userExpenses = userExpenses.filter(expense => 
        expense.date >= startDate && expense.date <= endDate
      );
    }

    // Calculate total
    const total = userExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate by category with color information
    const byCategory = {};
    userExpenses.forEach(expense => {
      if (byCategory[expense.category]) {
        byCategory[expense.category].total += expense.amount;
      } else {
        // Find category color
        const categoryInfo = categories.find(c => c.name === expense.category);
        byCategory[expense.category] = {
          total: expense.amount,
          color: categoryInfo ? categoryInfo.color : '#6c757d',
          name: expense.category
        };
      }
    });

    const categoryStats = Object.values(byCategory)
      .map(({ total, color, name }) => ({ 
        category: name, 
        total, 
        color,
        name: name // Add name for pie chart labels
      }))
      .sort((a, b) => b.total - a.total);

    res.json({
      total,
      byCategory: categoryStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Expenses API is running' });
});

// Debug endpoint to see all users (temporary - remove in production)
app.get('/api/debug/users', (req, res) => {
  try {
    const usersWithoutPasswords = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    }));
    
    res.json({
      totalUsers: users.length,
      users: usersWithoutPasswords,
      dataFile: USERS_FILE,
      fileExists: fs.existsSync(USERS_FILE)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Debug endpoint to see all expenses (temporary - remove in production)
app.get('/api/debug/expenses', (req, res) => {
  try {
    res.json({
      totalExpenses: expenses.length,
      expenses: expenses,
      dataFile: EXPENSES_FILE,
      fileExists: fs.existsSync(EXPENSES_FILE)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cleanup all data (for development/production deployment)
app.delete('/api/cleanup/all', async (req, res) => {
  try {
    // Reset to initial state
    users = [
      {
        id: 'default-user',
        username: 'demo',
        email: 'demo@example.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        created_at: new Date().toISOString()
      }
    ];
    
    expenses = [
      {
        id: '1',
        user_id: 'default-user',
        description: 'Grocery shopping',
        amount: 150.50,
        category: 'Food & Dining',
        date: '2024-01-15',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: 'default-user',
        description: 'Gas station',
        amount: 45.00,
        category: 'Transportation',
        date: '2024-01-14',
        created_at: new Date().toISOString()
      }
    ];
    
    nextExpenseId = 3;
    nextCategoryId = 9;
    saveData(USERS_FILE, users); // Save updated users
    saveData(EXPENSES_FILE, expenses); // Save updated expenses
    
    res.json({ 
      message: 'All data cleaned up successfully. Reset to demo state.',
      demoUser: {
        username: 'demo',
        password: 'password'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup data' });
  }
});

// Cleanup only users (reset to demo user)
app.delete('/api/cleanup/users', async (req, res) => {
  try {
    users = [
      {
        id: 'default-user',
        username: 'demo',
        email: 'demo@example.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        created_at: new Date().toISOString()
      }
    ];
    saveData(USERS_FILE, users); // Save updated users
    
    res.json({ 
      message: 'Users cleaned up successfully. Reset to demo user.',
      demoUser: {
        username: 'demo',
        password: 'password'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup users' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Database connection closed');
  process.exit(0);
}); 