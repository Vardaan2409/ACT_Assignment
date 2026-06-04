const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { WebSocketServer } = require('ws');
const eventBus = require('./utils/events');

dotenv.config();

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Database connection
if (!process.env.MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// HTTP Server wrapper for WebSocket support
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });
eventBus.setWebSocketServer(wss);

wss.on('connection', (ws) => {
  console.log('🔌 Client connected to Live Sync WebSocket Hub');
  
  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    message: 'Successfully connected to Live Sync Event Bus'
  }));

  ws.on('close', () => {
    console.log('🔌 Client disconnected from Live Sync WebSocket Hub');
  });
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const subscriptionRoutes = require('./routes/subscription');
const propertyRoutes = require('./routes/property');
const otpRoutes = require('./routes/otp');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'MERN Dashboard API with Real-time synchronization is running 🚀' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
