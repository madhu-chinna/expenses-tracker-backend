const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// Database setup
const db = new sqlite3.Database('./expenses.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createExpensesTable = `
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `;

  const createCategoriesTable = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#007bff'
    )
  `;

  db.run(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists');
    }
  });

  db.run(createExpensesTable, (err) => {
    if (err) {
      console.error('Error creating expenses table:', err.message);
    } else {
      console.log('Expenses table created or already exists');
    }
  });

  db.run(createCategoriesTable, (err) => {
    if (err) {
      console.error('Error creating categories table:', err.message);
    } else {
      console.log('Categories table created or already exists');
      // Insert default categories
      insertDefaultCategories();
    }
  });
}

// Insert default categories
function insertDefaultCategories() {
  const defaultCategories = [
    { name: 'Food & Dining', color: '#28a745' },
    { name: 'Transportation', color: '#007bff' },
    { name: 'Shopping', color: '#ffc107' },
    { name: 'Entertainment', color: '#dc3545' },
    { name: 'Bills & Utilities', color: '#6f42c1' },
    { name: 'Healthcare', color: '#fd7e14' },
    { name: 'Education', color: '#20c997' },
    { name: 'Other', color: '#6c757d' }
  ];

  defaultCategories.forEach(category => {
    db.run('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)', 
      [category.name, category.color]);
  });
}

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
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (user) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const { v4: uuidv4 } = require('uuid');
      const userId = uuidv4();

      // Create user
      db.run('INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)', 
        [userId, username, email, hashedPassword], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Generate JWT token
        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { id: userId, username, email }
        });
      });
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

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const isValidPassword = await bcrypt.compare(password, user.password);
      
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
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.user.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });
});

// API Routes (Protected)

// Get all expenses for current user
app.get('/api/expenses', authenticateToken, (req, res) => {
  const query = `
    SELECT e.*, c.name as category_name, c.color as category_color 
    FROM expenses e 
    LEFT JOIN categories c ON e.category = c.name 
    WHERE e.user_id = ?
    ORDER BY e.date DESC
  `;
  
  db.all(query, [req.user.userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get expense by ID (for current user)
app.get('/api/expenses/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT e.*, c.name as category_name, c.color as category_color 
    FROM expenses e 
    LEFT JOIN categories c ON e.category = c.name 
    WHERE e.id = ? AND e.user_id = ?
  `;
  
  db.get(query, [req.params.id, req.user.userId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    res.json(row);
  });
});

// Create new expense (for current user)
app.post('/api/expenses', authenticateToken, (req, res) => {
  const { description, amount, category, date } = req.body;
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();

  if (!description || !amount || !category || !date) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const query = 'INSERT INTO expenses (id, user_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.run(query, [id, req.user.userId, description, amount, category, date], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Return the created expense
    db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json(row);
    });
  });
});

// Update expense (for current user)
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  const { description, amount, category, date } = req.body;
  const { id } = req.params;

  if (!description || !amount || !category || !date) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const query = 'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ? AND user_id = ?';
  
  db.run(query, [description, amount, category, date, id, req.user.userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    
    // Return the updated expense
    db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    });
  });
});

// Delete expense (for current user)
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, req.user.userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    
    res.json({ message: 'Expense deleted successfully' });
  });
});

// Get all categories (public)
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get expense statistics (for current user)
app.get('/api/statistics', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = 'WHERE user_id = ?';
  let params = [req.user.userId];
  
  if (startDate && endDate) {
    dateFilter = 'WHERE user_id = ? AND date BETWEEN ? AND ?';
    params = [req.user.userId, startDate, endDate];
  }

  const totalQuery = `SELECT SUM(amount) as total FROM expenses ${dateFilter}`;
  const categoryQuery = `
    SELECT category, SUM(amount) as total 
    FROM expenses 
    ${dateFilter}
    GROUP BY category 
    ORDER BY total DESC
  `;

  db.get(totalQuery, params, (err, totalRow) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.all(categoryQuery, params, (err, categoryRows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        total: totalRow.total || 0,
        byCategory: categoryRows
      });
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Expenses API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
}); 