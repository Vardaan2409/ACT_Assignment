const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isOwnerListed: {
    type: Boolean,
    default: false,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  impressions: {
    type: Number,
    default: 0,
  },
  leadsCount: {
    type: Number,
    default: 0,
  },
  // Geospatial coordinate location (longitude, latitude)
  locationCoords: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [77.2090, 28.6139] // Delhi Center defaults
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, {
  timestamps: true,
});

// 2dsphere index for geospatial searches
propertySchema.index({ locationCoords: '2dsphere' });

module.exports = mongoose.model('Property', propertySchema);
