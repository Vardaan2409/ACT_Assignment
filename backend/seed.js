const mongoose = require('mongoose');
const User = require('./models/User');
const Lead = require('./models/Lead');
const Task = require('./models/Task');
const Property = require('./models/Property');
const PropertyBoost = require('./models/PropertyBoost');
const dotenv = require('dotenv');

dotenv.config();

const clearData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear all collections
        await User.deleteMany({});
        await Lead.deleteMany({});
        await Task.deleteMany({});
        await Property.deleteMany({});
        await PropertyBoost.deleteMany({});

        console.log('🗑️ All database records have been successfully cleared!');
        process.exit();
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
};

clearData();
