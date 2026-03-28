const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['New', 'In Progress', 'Completed', 'Lost'],
    default: 'New',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Lead', leadSchema);
