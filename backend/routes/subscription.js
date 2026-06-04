const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const eventBus = require('../utils/events');

// Initialize Razorpay
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'mockKeySecret123';
const isMockMode = razorpayKeyId === 'rzp_test_mockKeyId123';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

// Plan prices in INR and Paisa
const PLANS = {
  Free: { price: 0, days: 0 },
  Basic: { price: 499, days: 30 },
  Pro: { price: 999, days: 30 },
  Enterprise: { price: 2499, days: 30 }
};

// @desc Get subscription status, history and invoices
// @route GET /api/subscription/status
// @access Private
router.get('/status', protect, async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      subscription = await Subscription.create({
        user: req.user._id,
        plan: 'Free',
        status: 'active',
        startDate: new Date(),
        endDate: null
      });
    }

    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    const invoices = await Invoice.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.json({
      subscription,
      transactions,
      invoices,
      razorpayKeyId
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ message: 'Server error fetching billing details' });
  }
});

// @desc Create Razorpay Order
// @route POST /api/subscription/create-order
// @access Private
router.post('/create-order', protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANS[plan] || plan === 'Free') {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const amountInPaisa = PLANS[plan].price * 100;

    let orderId;
    if (isMockMode) {
      orderId = 'order_mock_' + crypto.randomBytes(8).toString('hex');
    } else {
      const options = {
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `receipt_${req.user._id.toString().substring(0, 5)}_${Date.now()}`
      };
      const order = await razorpay.orders.create(options);
      orderId = order.id;
    }

    // Save transaction as created
    await Transaction.create({
      user: req.user._id,
      orderId,
      amount: PLANS[plan].price,
      currency: 'INR',
      status: 'created',
      plan
    });

    res.json({
      orderId,
      amount: amountInPaisa,
      currency: 'INR',
      keyId: razorpayKeyId,
      isMock: isMockMode
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error initiating payment order' });
  }
});

// Helper function to handle successful subscription activation
const activateSubscription = async (userId, plan, transactionId, amount, userEmail, userName) => {
  const durationDays = PLANS[plan].days;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + durationDays);

  // 1. Update/Create Subscription
  let subscription = await Subscription.findOne({ user: userId });
  if (subscription) {
    subscription.plan = plan;
    subscription.status = 'active';
    subscription.startDate = startDate;
    subscription.endDate = endDate;
    await subscription.save();
  } else {
    subscription = await Subscription.create({
      user: userId,
      plan,
      status: 'active',
      startDate,
      endDate
    });
  }

  // 2. Generate unique invoice number
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-${year}-${randomNum}`;

  // 3. Create Invoice
  const invoice = await Invoice.create({
    user: userId,
    transaction: transactionId,
    invoiceNumber,
    amount,
    plan,
    billingDetails: {
      name: userName || 'Customer',
      email: userEmail
    },
    date: startDate
  });

  // 4. Publish Event
  await eventBus.publish({
    action: 'SUBSCRIPTION_CREATED',
    userId,
    entityType: 'Subscription',
    entityId: subscription._id,
    description: `User activated ${plan} Plan`
  });

  return { subscription, invoice };
};

// @desc Verify Razorpay Payment Signature
// @route POST /api/subscription/verify-payment
// @access Private
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const transaction = await Transaction.findOne({ orderId: razorpay_order_id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found' });
    }

    let isVerified = false;

    if (isMockMode) {
      // Mock validation
      isVerified = razorpay_payment_id && razorpay_signature === 'mock_signature_verified';
    } else {
      // Production verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(body.toString())
        .digest('hex');

      isVerified = expectedSignature === razorpay_signature;
    }

    if (!isVerified) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    // Update transaction to captured
    transaction.paymentId = razorpay_payment_id;
    transaction.signature = razorpay_signature;
    transaction.status = 'captured';
    await transaction.save();

    // Activate subscription and generate invoice
    const result = await activateSubscription(
      req.user._id,
      transaction.plan,
      transaction._id,
      transaction.amount,
      req.user.email,
      req.user.name
    );

    res.json({
      message: 'Payment verified and subscription activated successfully! 🚀',
      subscription: result.subscription,
      invoice: result.invoice
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Error verifying payment details' });
  }
});

// @desc Razorpay Webhook listener for background synchronization
// @route POST /api/subscription/webhook
// @access Public (Verifies signature)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      return res.status(400).send('No signature header provided');
    }

    // Verify signature using rawBody parsed in server.js
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'mockWebhookSecret123')
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature && !isMockMode) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    console.log(`Razorpay webhook received event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      
      const transaction = await Transaction.findOne({ orderId }).populate('user');
      if (transaction && transaction.status !== 'captured') {
        transaction.status = 'captured';
        transaction.paymentId = paymentEntity.id;
        await transaction.save();

        const user = transaction.user;
        if (user) {
          await activateSubscription(
            user._id,
            transaction.plan,
            transaction._id,
            transaction.amount,
            user.email,
            user.name
          );
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const transaction = await Transaction.findOne({ orderId });
      if (transaction) {
        transaction.status = 'failed';
        await transaction.save();
      }
    }

    res.status(200).send('ok');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook server error');
  }
});

// @desc Billing & revenue analytics
// @route GET /api/subscription/analytics
// @access Private
router.get('/analytics', protect, async (req, res) => {
  try {
    // Total revenue calculations (captured transactions)
    const paidTransactions = await Transaction.find({ status: 'captured' });
    const totalRevenue = paidTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate MRR
    // Basic = 499, Pro = 999, Enterprise = 2499
    // Sum active subscriptions monthly rate
    const activeSubscriptions = await Subscription.find({ status: 'active' }).populate('user');
    let mrr = 0;
    const planCounts = { Free: 0, Basic: 0, Pro: 0, Enterprise: 0 };
    
    activeSubscriptions.forEach(sub => {
      planCounts[sub.plan] = (planCounts[sub.plan] || 0) + 1;
      if (sub.plan === 'Basic') mrr += PLANS.Basic.price;
      if (sub.plan === 'Pro') mrr += PLANS.Pro.price;
      if (sub.plan === 'Enterprise') mrr += PLANS.Enterprise.price;
    });

    // Conversion rate: users with paid plans vs total registered users
    const totalUsers = await User.countDocuments();
    const paidUsersCount = await Subscription.countDocuments({ 
      plan: { $ne: 'Free' }, 
      status: 'active' 
    });
    const conversionRate = totalUsers > 0 ? ((paidUsersCount / totalUsers) * 100).toFixed(1) : 0;

    res.json({
      totalRevenue,
      mrr,
      conversionRate: parseFloat(conversionRate),
      totalUsers,
      paidUsersCount,
      planCounts,
      planPrices: PLANS
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error loading subscription analytics' });
  }
});

module.exports = router;
