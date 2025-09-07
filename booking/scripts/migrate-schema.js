#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Starting database migration...');

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Deploy database changes
  console.log('🚀 Deploying database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Database migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
