const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const OtpLog = require('../models/OtpLog');
const User = require('../models/User');

// ─── In-memory short-window cache for brute-force ──────────────────────────
// Tracks failed attempts per phone (not persisted — resets on restart)
const failureCache = new NodeCache({ stdTTL: 900 }); // 15 min window

// ─── Rate Limiters ─────────────────────────────────────────────────────────

// Max 3 OTP send requests per phone per 10 minutes (IP-based)
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `${req.ip}_${req.body.phone || ''}`,
  message: { message: 'Too many OTP requests. Please wait 10 minutes before retrying.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Max 5 verify attempts per IP per 10 minutes
const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}_${req.body.phone || ''}`,
  message: { message: 'Too many verification attempts. Please request a new OTP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Constants ─────────────────────────────────────────────────────────────

const OTP_EXPIRY_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;

const MSG91_KEY    = process.env.MSG91_AUTH_KEY  || '';
const MSG91_SENDER = process.env.MSG91_SENDER_ID || 'MERDSH';
const MSG91_DLT_TE_ID = process.env.MSG91_DLT_TE_ID || '';

const isMockSMS = !MSG91_KEY;

// ─── Helpers ───────────────────────────────────────────────────────────────

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

const verifyOtpHash = async (otp, hash) =>
  bcrypt.compare(otp, hash);

const normalizePhone = (phone) => {
  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');
  // Ensure 91XXXXXXXXXX (India)
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
};

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ─── MSG91 SMS Dispatch ────────────────────────────────────────────────────

const sendSmsMSG91 = async (phone, otp, purpose) => {
  if (isMockSMS) {
    // Development / CI mode — log to console, never hit MSG91
    console.log(`\n📱 [MOCK SMS] Phone: +${phone}`);
    console.log(`   Purpose : ${purpose}`);
    console.log(`   OTP     : ${otp}`);
    console.log(`   Expires : ${OTP_EXPIRY_MINUTES} minutes\n`);
    return { success: true, mock: true, requestId: `mock_${Date.now()}` };
  }

  try {
    // MSG91 Flow API (v5) — template-based
    const payload = {
      template_id: MSG91_DLT_TE_ID,
      short_url: '0',
      mobiles: phone,
      otp,
      otp_expiry: OTP_EXPIRY_MINUTES,
    };

    const { data } = await axios.post(
      'https://api.msg91.com/api/v5/otp',
      payload,
      {
        headers: {
          authkey: MSG91_KEY,
          'content-type': 'application/json',
        },
        timeout: 8000,
      }
    );

    if (data.type === 'success') {
      return { success: true, requestId: data.request_id };
    }
    return { success: false, error: data.message || 'MSG91 rejected request' };
  } catch (err) {
    console.error('[MSG91 Error]', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

// ─── Abuse Detection ───────────────────────────────────────────────────────

const isPhoneBlocked = (phone) => {
  const failures = failureCache.get(`fail_${phone}`) || 0;
  return failures >= MAX_VERIFY_ATTEMPTS;
};

const recordFailure = (phone) => {
  const key = `fail_${phone}`;
  const current = failureCache.get(key) || 0;
  failureCache.set(key, current + 1);
};

const clearFailures = (phone) => {
  failureCache.del(`fail_${phone}`);
};

// ─── Routes ────────────────────────────────────────────────────────────────

/**
 * POST /api/otp/send
 * Body: { phone, purpose: 'login'|'signup'|'phone_verify' }
 *
 * Rate limited: 3 requests per 10 min per phone+IP
 */
router.post('/send', sendOtpLimiter, async (req, res) => {
  try {
    const { phone, purpose = 'phone_verify' } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const validPurposes = ['login', 'signup', 'phone_verify'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ message: 'Invalid OTP purpose.' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10 || normalizedPhone.length > 13) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    // Block if phone is on abuse list
    if (isPhoneBlocked(normalizedPhone)) {
      return res.status(429).json({
        message: 'Too many failed attempts. Please wait 15 minutes before trying again.',
        retryAfter: 900,
      });
    }

    // Invalidate any existing active OTPs for this phone+purpose
    await OtpLog.updateMany(
      { phone: normalizedPhone, purpose, status: 'sent' },
      { $set: { status: 'expired' } }
    );

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // Dispatch SMS
    const smsResult = await sendSmsMSG91(normalizedPhone, otp, purpose);

    const logStatus = smsResult.success ? 'sent' : 'failed';

    // Persist log (with hashed OTP)
    await OtpLog.create({
      phone: normalizedPhone,
      purpose,
      status: logStatus,
      otpHash,
      expiresAt,
      ipAddress,
      userAgent,
      msg91RequestId: smsResult.requestId || null,
    });

    if (!smsResult.success) {
      return res.status(502).json({
        message: 'Failed to send SMS. Please try again.',
        ...(isMockSMS ? { dev_error: smsResult.error } : {}),
      });
    }

    return res.json({
      message: 'OTP sent successfully.',
      phone: `XXXXXX${normalizedPhone.slice(-4)}`,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      mock: smsResult.mock || false,
      // In mock/dev mode, return OTP in response for easy testing
      ...(isMockSMS ? { dev_otp: otp } : {}),
    });
  } catch (err) {
    console.error('[OTP Send Error]', err.message);
    return res.status(500).json({ message: 'Server error sending OTP.' });
  }
});

/**
 * POST /api/otp/verify
 * Body: { phone, otp, purpose }
 *
 * Rate limited: 5 attempts per 10 min per phone+IP
 */
router.post('/verify', verifyOtpLimiter, async (req, res) => {
  try {
    const { phone, otp, purpose = 'phone_verify' } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required.' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Block abusive phone
    if (isPhoneBlocked(normalizedPhone)) {
      return res.status(429).json({
        message: 'Too many failed attempts. Please request a new OTP.',
        retryAfter: 900,
      });
    }

    // Find the most recent active OTP
    const otpRecord = await OtpLog.findOne({
      phone: normalizedPhone,
      purpose,
      status: 'sent',
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'No active OTP found. Please request a new one.',
      });
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      otpRecord.status = 'expired';
      await otpRecord.save();
      return res.status(400).json({
        message: 'OTP has expired. Please request a new one.',
        expired: true,
      });
    }

    // Increment attempt counter
    otpRecord.attempts += 1;

    // Max attempts per OTP record
    if (otpRecord.attempts > MAX_VERIFY_ATTEMPTS) {
      otpRecord.status = 'expired';
      await otpRecord.save();
      recordFailure(normalizedPhone);
      return res.status(429).json({
        message: 'Maximum verification attempts exceeded. Request a new OTP.',
      });
    }

    // Verify hash
    const isValid = await verifyOtpHash(otp.trim(), otpRecord.otpHash);

    if (!isValid) {
      await otpRecord.save();
      recordFailure(normalizedPhone);
      const remaining = MAX_VERIFY_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // ✅ OTP correct — mark verified
    otpRecord.status = 'verified';
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();
    clearFailures(normalizedPhone);

    // Update User phone verification status
    const updatedUser = await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { isPhoneVerified: true },
      { new: true }
    );

    // For login purpose — return JWT if user exists
    if (purpose === 'login' && updatedUser) {
      return res.json({
        message: 'Phone verified successfully.',
        verified: true,
        token: generateToken(updatedUser._id),
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          isPhoneVerified: true,
        },
      });
    }

    return res.json({
      message: 'Phone verified successfully.',
      verified: true,
      phone: normalizedPhone,
    });
  } catch (err) {
    console.error('[OTP Verify Error]', err.message);
    return res.status(500).json({ message: 'Server error verifying OTP.' });
  }
});

/**
 * POST /api/otp/resend
 * Body: { phone, purpose }
 *
 * Thin wrapper — enforces cooldown via rate limiter on /send
 */
router.post('/resend', sendOtpLimiter, async (req, res) => {
  // Same logic as /send — rate limiter prevents abuse
  return router.handle(
    Object.assign(req, { url: '/send', path: '/send' }),
    res,
    () => {}
  );
});

/**
 * GET /api/otp/stats
 * Returns platform-wide OTP analytics (admin use)
 */
router.get('/stats', async (req, res) => {
  try {
    const [total, sent, verified, failed, expired] = await Promise.all([
      OtpLog.countDocuments(),
      OtpLog.countDocuments({ status: 'sent' }),
      OtpLog.countDocuments({ status: 'verified' }),
      OtpLog.countDocuments({ status: 'failed' }),
      OtpLog.countDocuments({ status: 'expired' }),
    ]);

    const successRate = total > 0
      ? ((verified / total) * 100).toFixed(1)
      : 0;

    const purposeBreakdown = await OtpLog.aggregate([
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
    ]);

    // Recent 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = await OtpLog.countDocuments({ createdAt: { $gte: since } });

    res.json({
      total,
      sent,
      verified,
      failed,
      expired,
      successRate: parseFloat(successRate),
      last24h,
      purposeBreakdown,
      mockMode: isMockSMS,
    });
  } catch (err) {
    console.error('[OTP Stats Error]', err.message);
    res.status(500).json({ message: 'Error fetching OTP analytics.' });
  }
});

module.exports = router;
