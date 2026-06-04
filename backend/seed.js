const mongoose = require('mongoose');
const User = require('./models/User');
const Lead = require('./models/Lead');
const Task = require('./models/Task');
const Property = require('./models/Property');
const PropertyBoost = require('./models/PropertyBoost');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Clear existing data
        await User.deleteMany({});
        await Lead.deleteMany({});
        await Task.deleteMany({});
        await Property.deleteMany({});
        await PropertyBoost.deleteMany({});

        // 2. Seed Users
        const usersToSeed = [
            { name: 'Admin User', email: 'admin@example.com', password: 'password123' },
            { name: 'Alice Walker', email: 'alice@example.com', password: 'password123' },
            { name: 'Bob Brown', email: 'bob@example.com', password: 'password123' },
        ];
        
        const createdUsers = [];
        for (const u of usersToSeed) {
            const user = new User(u);
            await user.save();
            createdUsers.push(user);
        }
        console.log('✅ 3 Users seeded (admin@example.com / password123)');
        
        const adminUser = createdUsers[0];

        // 3. Seed Leads
        const dummyLeads = [
            { name: 'John Doe', company: 'ABC Corp', email: 'john@abc.com', status: 'In Progress' },
            { name: 'Jane Smith', company: 'XYZ Ltd', email: 'jane@xyz.com', status: 'Completed' },
            { name: 'Robert Johnson', company: 'MNO Inc', email: 'robert@mno.com', status: 'New' },
            { name: 'Emily Davis', company: 'TechNova', email: 'emily@technova.com', status: 'New' },
            { name: 'Michael Lee', company: 'CloudBase', email: 'michael@cloudbase.io', status: 'In Progress' },
            { name: 'Sarah Williams', company: 'DataSync', email: 'sarah@datasync.net', status: 'Completed' },
            { name: 'Chris Evans', company: 'Nexus Solutions', email: 'chris@nexus.com', status: 'Lost' },
            { name: 'Priya Sharma', company: 'InfoTech India', email: 'priya@infotech.in', status: 'New' },
            { name: 'David Clark', company: 'ClearSky Ltd', email: 'david@clearsky.com', status: 'In Progress' },
        ];
        await Lead.insertMany(dummyLeads);
        console.log('✅ 9 Leads seeded');

        // 4. Seed Tasks
        const dummyTasks = [
            { title: 'Follow up with ABC Corp', priority: 'High', dueDate: '2026-04-10' },
            { title: 'Send proposal to XYZ Ltd', priority: 'Medium', dueDate: '2026-04-12' },
            { title: 'Update lead database', priority: 'Low', dueDate: '2026-04-15' },
            { title: 'Prepare Q2 sales report', priority: 'High', dueDate: '2026-04-08' },
            { title: 'Schedule onboarding call with TechNova', priority: 'Medium', dueDate: '2026-04-11' },
            { title: 'Review CloudBase contract', priority: 'High', dueDate: '2026-04-09' },
            { title: 'Send welcome kit to new clients', priority: 'Low', dueDate: '2026-04-18' },
            { title: 'Audit CRM records for duplicates', priority: 'Medium', dueDate: '2026-04-20' },
            { title: 'Team performance review', priority: 'Low', dueDate: '2026-04-25' },
        ];
        await Task.insertMany(dummyTasks);
        console.log('✅ 9 Tasks seeded');

        // 5. Seed Properties
        const dummyProperties = [
            {
                title: 'Luxury Apartment in Mumbai',
                description: 'Stunning 3BHK flat overlooking the Arabian Sea with premium fittings.',
                price: 45000000,
                location: 'Worli, Mumbai',
                isVerified: true,
                isOwnerListed: true,
                clicks: 120,
                impressions: 1450,
                leadsCount: 14,
                user: adminUser._id,
                createdAt: new Date() // recent listing
            },
            {
                title: 'Modern Villa in Bangalore',
                description: 'Spacious independent villa with private garden and pool.',
                price: 65000000,
                location: 'Whitefield, Bangalore',
                isVerified: true,
                isOwnerListed: false,
                clicks: 85,
                impressions: 1100,
                leadsCount: 6,
                user: adminUser._id,
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // old listing (10 days ago)
            },
            {
                title: 'Cozy Studio in Delhi',
                description: 'Compact well-lit studio apartment near metro station.',
                price: 8000000,
                location: 'Karol Bagh, Delhi',
                isVerified: false,
                isOwnerListed: true,
                clicks: 40,
                impressions: 600,
                leadsCount: 2,
                user: adminUser._id,
                createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // old listing
            },
            {
                title: 'Penthouse in Pune',
                description: 'Exquisite duplex penthouse with private terrace and premium amenities.',
                price: 32000000,
                location: 'Koregaon Park, Pune',
                isVerified: false,
                isOwnerListed: false,
                clicks: 10,
                impressions: 200,
                leadsCount: 0,
                user: adminUser._id,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // recent (3 days ago)
            }
        ];
        await Property.insertMany(dummyProperties);
        console.log('✅ 4 Property listings seeded');

        console.log('🚀 Database Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
