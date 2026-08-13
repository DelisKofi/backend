import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import { Role } from '../src/modules/roles/role.model.js';
import { User } from '../src/modules/users/user.model.js';

dotenv.config();

const email = 'admin@kenzyaccessories.com';
const password = 'Kenzy@123';

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in .env');
  }

  await mongoose.connect(mongoUri);

  const adminRole = await Role.findOneAndUpdate(
    { name: /^Administrator$/i },
    {
      $setOnInsert: {
        name: 'Administrator',
        description: 'System administrator',
        allAccess: true,
        allBranches: true,
        permissions: { globalAdmin: true },
        deletedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    const createdUser = await User.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      firstName: 'System',
      lastName: 'Admin',
      roleId: String(adminRole._id),
      branchIds: [],
      status: 'active',
      isFirstTimeUser: false,
      tokenVersion: 0,
      lastActiveAt: new Date(),
    });

    console.log(JSON.stringify({
      action: 'created',
      email,
      password,
      userId: String(createdUser._id),
      roleId: String(adminRole._id),
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      action: 'existing',
      email,
      password,
      userId: String(existingUser._id),
      roleId: String(existingUser.roleId),
    }, null, 2));
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Failed to create admin user:', error);
  process.exit(1);
});
