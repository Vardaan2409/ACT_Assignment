const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/auth');
const Property = require('../models/Property');
const PropertyBoost = require('../models/PropertyBoost');

// Initialize Razorpay
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'mockKeySecret123';
const isMockMode = razorpayKeyId === 'rzp_test_mockKeyId123';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

// Boost configuration rules
const BOOSTS = {
  'Featured 7 Days': { price: 199, days: 7, score: 40 },
  'Featured 15 Days': { price: 349, days: 15, score: 40 },
  'Featured 30 Days': { price: 599, days: 30, score: 40 },
  'Premium Placement': { price: 899, days: 30, score: 60 },
  'Homepage Placement': { price: 1299, days: 30, score: 60 }
};

// @desc Fetch all properties sorted by weighted search ranking algorithm
// @route GET /api/properties
// @access Public
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find({}).populate('user', 'name email');
    
    // Find all active boosts
    const activeBoosts = await PropertyBoost.find({
      endDate: { $gte: new Date() }
    });

    const activeBoostMap = {};
    activeBoosts.forEach(boost => {
      if (!activeBoostMap[boost.propertyId.toString()] || activeBoostMap[boost.propertyId.toString()].boostScore < boost.boostScore) {
        activeBoostMap[boost.propertyId.toString()] = boost;
      }
    });

    // Calculate score and map properties
    const rankedProperties = properties.map(property => {
      let score = 0;
      
      // Verified Listing +20
      if (property.isVerified) score += 20;
      
      // Owner Listed +15
      if (property.isOwnerListed) score += 15;
      
      // Recent Listing (created within last 7 days) +10
      const diffTime = Math.abs(new Date() - property.createdAt);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) score += 10;

      // Active Boost: Featured +40, Premium Placement/Homepage Placement +60
      const activeBoost = activeBoostMap[property._id.toString()];
      let activeBoostInfo = null;
      
      if (activeBoost) {
        score += activeBoost.boostScore;
        activeBoostInfo = {
          boostType: activeBoost.boostType,
          endDate: activeBoost.endDate,
          boostScore: activeBoost.boostScore
        };
      }

      // Track clicks/impressions simulator increment for demo
      property.impressions += Math.floor(Math.random() * 5) + 1;
      property.save();

      return {
        ...property.toObject(),
        rankingScore: score,
        activeBoost: activeBoostInfo
      };
    });

    // Sort by rankingScore descending
    rankedProperties.sort((a, b) => b.rankingScore - a.rankingScore);

    res.json(rankedProperties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: 'Error processing property query search' });
  }
});

// @desc Add property interaction metrics (Clicks / Leads)
// @route POST /api/properties/:id/interact
// @access Public
router.post('/:id/interact', async (req, res) => {
  try {
    const { action } = req.body; // 'click' or 'lead'
    const property = await Property.findById(req.id || req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (action === 'click') {
      property.clicks += 1;
    } else if (action === 'lead') {
      property.leadsCount += 1;
    }
    await property.save();

    res.json({ message: 'Interaction tracked successfully', property });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc Create a new property listing
// @route POST /api/properties
// @access Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, price, location, isVerified, isOwnerListed } = req.body;

    const property = await Property.create({
      title,
      description,
      price,
      location,
      isVerified: !!isVerified,
      isOwnerListed: !!isOwnerListed,
      user: req.user._id
    });

    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Error publishing listing' });
  }
});

// @desc Create Razorpay Order for Boost payment
// @route POST /api/properties/boost/create-order
// @access Private
router.post('/boost/create-order', protect, async (req, res) => {
  try {
    const { propertyId, boostType } = req.body;

    if (!BOOSTS[boostType]) {
      return res.status(400).json({ message: 'Invalid boost type selected' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    const price = BOOSTS[boostType].price;
    const amountInPaisa = price * 100;

    let orderId;
    if (isMockMode) {
      orderId = 'boost_order_mock_' + crypto.randomBytes(8).toString('hex');
    } else {
      const options = {
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `boost_receipt_${propertyId.substring(0, 5)}_${Date.now()}`
      };
      const order = await razorpay.orders.create(options);
      orderId = order.id;
    }

    res.json({
      orderId,
      amount: amountInPaisa,
      currency: 'INR',
      keyId: razorpayKeyId,
      isMock: isMockMode,
      propertyId,
      boostType
    });
  } catch (error) {
    console.error('Error initiating boost order:', error);
    res.status(500).json({ message: 'Error initiating boost payment' });
  }
});

// @desc Verify signature and create Property Boost
// @route POST /api/properties/boost/verify
// @access Private
router.post('/boost/verify', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      propertyId,
      boostType
    } = req.body;

    let isVerified = false;

    if (isMockMode) {
      isVerified = razorpay_payment_id && razorpay_signature === 'mock_signature_verified';
    } else {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(body.toString())
        .digest('hex');

      isVerified = expectedSignature === razorpay_signature;
    }

    if (!isVerified) {
      return res.status(400).json({ message: 'Signature verification failed' });
    }

    const boostConfig = BOOSTS[boostType];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + boostConfig.days);

    // Save PropertyBoost record
    const boost = await PropertyBoost.create({
      propertyId,
      boostType,
      startDate,
      endDate,
      boostScore: boostConfig.score,
      paymentId: razorpay_payment_id
    });

    // Mock interactive boost impact for metrics demo
    const property = await Property.findById(propertyId);
    if (property) {
      // Simulate historical boost impact multiplier
      const multiplier = boostConfig.score === 60 ? 3 : 2;
      property.impressions += Math.floor(Math.random() * 200) + 150 * multiplier;
      property.clicks += Math.floor(Math.random() * 50) + 30 * multiplier;
      property.leadsCount += Math.floor(Math.random() * 10) + 5 * multiplier;
      await property.save();
    }

    res.json({
      message: 'Payment verified and listing boosted successfully! ⚡',
      boost
    });
  } catch (error) {
    console.error('Error verifying boost:', error);
    res.status(500).json({ message: 'Error processing boost verification' });
  }
});

// @desc Fetch User properties, active boosts, and performance metrics
// @route GET /api/properties/my-boosts
// @access Private
router.get('/my-boosts', protect, async (req, res) => {
  try {
    const userProperties = await Property.find({ user: req.user._id });
    const propertyIds = userProperties.map(p => p._id);

    // Find boosts for user properties
    const boosts = await PropertyBoost.find({
      propertyId: { $in: propertyIds }
    }).sort({ createdAt: -1 });

    // Format properties with active boost status and stats
    const listings = userProperties.map(prop => {
      const activeBoost = boosts.find(b => b.propertyId.toString() === prop._id.toString() && new Date(b.endDate) >= new Date());
      const allBoostsForProp = boosts.filter(b => b.propertyId.toString() === prop._id.toString());
      
      // Calculate remaining days
      let remainingDays = 0;
      if (activeBoost) {
        const diffTime = Math.abs(new Date(activeBoost.endDate) - new Date());
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Perform tracking simulator mock improvements for active boosts
      const impressionGain = activeBoost ? (activeBoost.boostScore === 60 ? '180%' : '120%') : '0%';
      const clickGain = activeBoost ? (activeBoost.boostScore === 60 ? '145%' : '90%') : '0%';
      const leadGain = activeBoost ? (activeBoost.boostScore === 60 ? '160%' : '110%') : '0%';

      return {
        _id: prop._id,
        title: prop.title,
        price: prop.price,
        location: prop.location,
        isVerified: prop.isVerified,
        isOwnerListed: prop.isOwnerListed,
        clicks: prop.clicks,
        impressions: prop.impressions,
        leadsCount: prop.leadsCount,
        activeBoost: activeBoost || null,
        remainingDays,
        boostHistory: allBoostsForProp,
        analytics: {
          impressionGain,
          clickGain,
          leadGain
        }
      };
    });

    res.json({
      listings,
      boostConfig: BOOSTS
    });
  } catch (error) {
    console.error('Error fetching my boosts:', error);
    res.status(500).json({ message: 'Error fetching listing analytics' });
  }
});

module.exports = router;
