const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc Get dashboard data
// @route GET /api/dashboard
// @access Private
router.get('/', protect, async (req, res) => {
  try {
    const leads = await Lead.find({});
    const tasks = await Task.find({});
    
    // For "Team Members", we can fetch all users or just mock some for variety 
    // since the user management part isn't fully implemented
    const users = await User.find({}).select('name email');
    
    // Add some dummy status/roles to the fetched users to match original design
    const teamMembers = users.map((u, index) => ({
      id: u._id,
      name: u.name,
      role: index === 0 ? 'Admin' : 'Team Member',
      status: 'Active',
    }));

    res.json({
      leads: leads,
      tasks: tasks,
      users: teamMembers,
      user: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

module.exports = router;
