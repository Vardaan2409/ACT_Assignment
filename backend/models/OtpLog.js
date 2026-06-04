const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  purpose: {
    type: String,
    enum: ['login', 'signup', 'phone_verify'],
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'verified', 'failed', 'expired'],
    default: 'sent',
    required: true,
  },
  // Store hashed OTP — never raw
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  // Attempt counter for brute-force prevention
  attempts: {
    type: Number,
    default: 0,
  },
  // IP that requested the OTP
  ipAddress: {
    type: String,
    default: null,
  },
  // User-Agent / device fingerprint
  userAgent: {
    type: String,
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // MSG91 response data
  msg91RequestId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Auto-expire expired OTP documents after 1 hour (TTL index)
otpLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('OtpLog', otpLogSchema);
