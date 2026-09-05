import { createUser, addPurchase, getUser } from './src/db.js';
import fs from 'fs';

const jsonPath = 'src/data/db.json';
if (!fs.existsSync(jsonPath)) {
  console.log('No db.json to migrate.');
  process.exit(0);
}

// Read file and strip BOM
let content = fs.readFileSync(jsonPath, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
const json = JSON.parse(content);

for (const user of json.users) {
  // check if already exists in SQLite
  const existing = getUser(user.email);
  if (existing) {
    console.log(`User ${user.email} already exists, skipping.`);
    continue;
  }

  // create user (password may be null for google-only)
  createUser({
    email: user.email,
    name: user.name || '',
    password: user.password || null,
    role: user.role || 'member',
    balance: user.balance || 0,
    avatar: user.avatar || null,
    googleOnly: user.googleOnly ? 1 : 0,
    createdAt: user.createdAt || Date.now(),
  });

  // add purchased upgrades
  if (Array.isArray(user.purchasedUpgrades)) {
    for (const id of user.purchasedUpgrades) {
      addPurchase(user.email, id);
    }
  }

  console.log(`Migrated: ${user.email}`);
}

console.log('Migration complete.');
process.exit(0);