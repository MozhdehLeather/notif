const express = require('express');
const jsonServer = require('json-server');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();

// Initialize JSON Server
const jsonServerApp = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// ========================
// Database Initialization
// ========================
const initializeDB = () => {
  const dbPath = path.join(__dirname, 'db.json');
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ notifications: [] }, null, 2));
    console.log('Created new empty database file');
  }
};

// ========================
// Middleware Setup
// ========================
app.use(express.json());
jsonServerApp.use(middlewares);
jsonServerApp.use(jsonServer.bodyParser);

// ========================
// Authentication Middleware
// ========================
jsonServerApp.use((req, res, next) => {
  // Public routes
  if (req.method === 'GET') {
    return next();
  }

  // Check for admin key
  const adminKey = req.headers.authorization || req.query.api_key;
  if (adminKey !== 'temple@123') {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid admin key required for this operation'
    });
  }
  next();
});

// ========================
// Custom Response Handler
// ========================
router.render = (req, res) => {
  let data = res.locals.data;

  // Sort notifications by createdAt (newest first)
  if (req.path === '/notifications' || req.path === '/notifications/') {
    data = Array.isArray(data) ? 
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : 
      data;
  }

  res.jsonp({
    success: true,
    data: data,
    timestamp: new Date().toISOString()
  });
};

// ========================
// Custom Routes
// ========================

// Enhanced POST endpoint
jsonServerApp.post('/notifications', (req, res, next) => {
  // Validation
  if (!req.body.title || !req.body.message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['title', 'message']
    });
  }

  // Default values
  req.body.createdAt = new Date().toISOString();
  req.body.updatedAt = req.body.createdAt;
  req.body.isActive = req.body.isActive !== false;
  req.body.id = Date.now();

  next();
});

// Custom PATCH endpoint
jsonServerApp.patch('/notifications/:id', (req, res, next) => {
  req.body.updatedAt = new Date().toISOString();
  next();
});

// ========================
// Admin Interface
// ========================
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ========================
// API Routes
// ========================
app.use('/api', jsonServerApp);
jsonServerApp.use(router);

// ========================
// Error Handling
// ========================
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  initializeDB();
  console.log(`
  🚀 Notification API Server running on port ${PORT}
  
  ==== Key Endpoints ====
  GET    /api/notifications      - List all notifications (newest first)
  POST   /api/notifications      - Create new notification
  GET    /api/notifications/:id  - Get single notification
  PATCH  /api/notifications/:id  - Update notification
  DELETE /api/notifications/:id  - Remove notification
  
  ==== Admin Access ====
  Admin Interface: /admin
  Admin Key: "temple@123" (send in Authorization header)
  `);
});
