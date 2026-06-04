const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const User = require('../models/User');
const eventBus = require('../utils/events');

// @desc Get dashboard data
// @route GET /api/dashboard
// @access Private
router.get('/', protect, async (req, res) => {
  try {
    const leads = await Lead.find({});
    const tasks = await Task.find({});
    const users = await User.find({}).select('name email');
    
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
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({ 
      message: 'Server error fetching dashboard data. Check DB connection.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc Create a new sales lead (Generates LEAD_CREATED event)
// @route POST /api/dashboard/leads
// @access Private
router.post('/leads', protect, async (req, res) => {
  try {
    const { name, company, email, status } = req.body;
    
    if (!name || !company || !email) {
      return res.status(400).json({ message: 'All fields name, company, email are required.' });
    }

    const lead = await Lead.create({ name, company, email, status });

    // Emit event
    await eventBus.publish({
      action: 'LEAD_CREATED',
      userId: req.user._id,
      entityType: 'Lead',
      entityId: lead._id,
      description: `${lead.name} from ${lead.company}`
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({ message: 'Error generating lead' });
  }
});

// @desc Create a task / schedule visit (Generates VISIT_CREATED event)
// @route POST /api/dashboard/tasks
// @access Private
router.post('/tasks', protect, async (req, res) => {
  try {
    const { title, priority, dueDate } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Title and due date are required.' });
    }

    const task = await Task.create({ title, priority, dueDate });

    // Emit event
    await eventBus.publish({
      action: 'VISIT_CREATED',
      userId: req.user._id,
      entityType: 'Task',
      entityId: task._id,
      description: task.title
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ message: 'Error scheduling visit task' });
  }
});

module.exports = router;
