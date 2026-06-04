const mongoose = require('mongoose');

const propertyBoostSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },
  boostType: {
    type: String,
    enum: [
      'Featured 7 Days',
      'Featured 15 Days',
      'Featured 30 Days',
      'Premium Placement',
      'Homepage Placement'
    ],
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  boostScore: {
    type: Number,
    required: true,
  },
  paymentId: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('PropertyBoost', propertyBoostSchema);
