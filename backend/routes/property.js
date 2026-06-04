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

// Simple seed list of landmarks to mock proximity queries
const MOCK_LANDMARKS = [
  { name: 'St. Xavier High School', type: 'school', distance: '0.8 km' },
  { name: 'DPS Public School', type: 'school', distance: '1.5 km' },
  { name: 'Max Super Speciality Hospital', type: 'hospital', distance: '1.2 km' },
  { name: 'Fortis Health Centre', type: 'hospital', distance: '2.1 km' },
  { name: 'Central Town Park', type: 'park', distance: '0.4 km' },
  { name: 'Eco Heritage Park', type: 'park', distance: '1.8 km' },
  { name: 'Olive Garden Restaurant', type: 'restaurant', distance: '0.2 km' },
  { name: 'The Golden Feast Bistro', type: 'restaurant', distance: '0.6 km' },
  { name: 'Rajiv Chowk Metro Station', type: 'metro', distance: '0.9 km' },
  { name: 'Connaught Place Transit Station', type: 'metro', distance: '1.4 km' },
];

// Helper to mock location-specific places
const getNearbyPlaces = (lat, lng) => {
  // Return places randomized slightly in distance based on latitude/longitude
  const seed = (lat + lng) * 1000;
  return MOCK_LANDMARKS.map((landmark, idx) => {
    const factor = ((seed + idx) % 10) / 10;
    const distanceVal = (0.2 + factor * 2.5).toFixed(1);
    return {
      ...landmark,
      distance: `${distanceVal} km`
    };
  });
};

// @desc Geospatial Property Search API (radius, bounding box / polygon, queries)
// @route GET /api/properties/search
// @access Public
router.get('/search', async (req, res) => {
  try {
    const { lat, lng, radius, polygon, search } = req.query;
    let dbQuery = {};

    // 1. Text Search filtering (title / description / location name)
    if (search) {
      dbQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Geospatial Search
    if (lat && lng && radius) {
      // Radius search: radius parameter is in kilometers (convert to meters: km * 1000)
      const radiusInMeters = parseFloat(radius) * 1000;
      dbQuery.locationCoords = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      };
    } else if (polygon) {
      // Draw area/polygon search
      // Expected input: polygon string format: "lng1,lat1;lng2,lat2;lng3,lat3;lng1,lat1"
      const coordinates = polygon.split(';').map(pt => {
        const [lngVal, latVal] = pt.split(',');
        return [parseFloat(lngVal), parseFloat(latVal)];
      });

      // Ensure the polygon forms a closed ring (first coordinate equals last)
      if (coordinates.length > 0 && 
          (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
           coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
        coordinates.push(coordinates[0]);
      }

      dbQuery.locationCoords = {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        }
      };
    }

    const properties = await Property.find(dbQuery).populate('user', 'name email');

    // Attach Active Boost stats & Mock Nearby Landmarks
    const activeBoosts = await PropertyBoost.find({ endDate: { $gte: new Date() } });
    const activeBoostMap = {};
    activeBoosts.forEach(boost => {
      if (!activeBoostMap[boost.propertyId.toString()] || activeBoostMap[boost.propertyId.toString()].boostScore < boost.boostScore) {
        activeBoostMap[boost.propertyId.toString()] = boost;
      }
    });

    const enriched = properties.map(property => {
      let score = 0;
      if (property.isVerified) score += 20;
      if (property.isOwnerListed) score += 15;

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

      const pCoords = property.locationCoords?.coordinates || [77.2090, 28.6139];
      const nearby = getNearbyPlaces(pCoords[1], pCoords[0]);

      return {
        ...property.toObject(),
        rankingScore: score,
        activeBoost: activeBoostInfo,
        nearbyPlaces: nearby
      };
    });

    // Sort by rankingScore descending
    enriched.sort((a, b) => b.rankingScore - a.rankingScore);

    res.json(enriched);
  } catch (error) {
    console.error('Error conducting geospatial search:', error);
    res.status(500).json({ message: 'Error processing map geospatial search' });
  }
});

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

      const pCoords = property.locationCoords?.coordinates || [77.2090, 28.6139];
      const nearby = getNearbyPlaces(pCoords[1], pCoords[0]);

      return {
        ...property.toObject(),
        rankingScore: score,
        activeBoost: activeBoostInfo,
        nearbyPlaces: nearby
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
    const { title, description, price, location, isVerified, isOwnerListed, longitude, latitude } = req.body;

    const property = await Property.create({
      title,
      description,
      price,
      location,
      isVerified: !!isVerified,
      isOwnerListed: !!isOwnerListed,
      locationCoords: {
        type: 'Point',
        coordinates: [
          longitude ? parseFloat(longitude) : 77.2090,
          latitude ? parseFloat(latitude) : 28.6139
        ]
      },
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
