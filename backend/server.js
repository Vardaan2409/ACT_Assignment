const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Trust proxy (for correct IP behind Render/Vercel/Nginx)
// app.set called after app init below

dotenv.config();

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Global rate limiter — 100 req / 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
    console.error('Check if your MONGO_URI is correct and IP is whitelisted in Atlas.');
  });

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const subscriptionRoutes = require('./routes/subscription');
const propertyRoutes = require('./routes/property');
const otpRoutes = require('./routes/otp');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/otp', otpRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'MERN Dashboard API is running 🚀' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
