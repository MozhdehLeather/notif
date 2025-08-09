const jsonServer = require('json-server');
const server = jsonServer.create();
const fs = require('fs');
const path = require('path');
const middlewares = jsonServer.defaults();

// Initialize database file if it doesn't exist
const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ notifications: [] }, null, 2));
  console.log('Created new empty database file');
}

// Create router after ensuring db exists
const router = jsonServer.router(dbPath);

// ========================
// Server Configuration
// ========================
server.use(middlewares);
server.use(jsonServer.bodyParser);

// ========================
// Authentication Middleware
// ========================
server.use((req, res, next) => {
  // Public routes (GET requests and specific endpoints)
  const publicRoutes = [
    '/notifications',
    '/admin'
  ];

  if (req.method === 'GET' || publicRoutes.includes(req.path)) {
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
// Custom Response Handling
// ========================
router.render = (req, res) => {
  let data = res.locals.data;

  // Sort notifications by createdAt (newest first)
  if (req.path === '/notifications' || req.path === '/notifications/') {
    data = Array.isArray(data) ? 
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : 
      data;
  }

  // Standard response format
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
server.post('/notifications', (req, res, next) => {
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
  req.body.isActive = req.body.isActive !== false; // Default true unless explicitly set to false
  req.body.id = Date.now(); // Simple ID generation

  next();
});

// Custom PATCH endpoint
server.patch('/notifications/:id', (req, res, next) => {
  req.body.updatedAt = new Date().toISOString();
  next();
});

// ========================
// Admin Interface
// ========================
server.use('/admin', express.static(path.join(__dirname, 'admin')));

// ========================
// Error Handling
// ========================
server.use((err, req, res, next) => {
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
server.use(router);
server.listen(PORT, () => {
  console.log(`
  🚀 Notification API Server running on port ${PORT}
  
  ==== Key Endpoints ====
  GET    /notifications      - List all notifications (newest first)
  POST   /notifications      - Create new notification
  GET    /notifications/:id  - Get single notification
  PATCH  /notifications/:id  - Update notification
  DELETE /notifications/:id  - Remove notification
  
  ==== Admin Access ====
  Admin Interface: /admin
  Admin Key: "temple@123" (send in Authorization header)
  
  ==== Development ====
  Database file: ${dbPath}
  `);
});