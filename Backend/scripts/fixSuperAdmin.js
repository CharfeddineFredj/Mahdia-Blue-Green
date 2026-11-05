const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const fixSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const admin = await User.findOne({ email: 'admin@mahdiabluegreen.com' });
    
    if (admin) {
      admin.questionnaireCompleted = true;
      admin.isEmailVerified = true;
      admin.isVerified = true;
      await admin.save();
      console.log('✅ Admin updated successfully!');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('questionnaireCompleted:', admin.questionnaireCompleted);
      console.log('isEmailVerified:', admin.isEmailVerified);
    } else {
      console.log('❌ Admin user not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixSuperAdmin();
