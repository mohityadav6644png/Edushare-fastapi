const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      name: 'Admin User',
      email: 'admin@studyshare.com',
      password: 'admin123',
      role: 'admin'
    };

    const admin = await User.create(adminData);

    console.log('Admin user created successfully:');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('Role:', admin.role);
    console.log('\nPlease change the password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run the script
createAdminUser();
