// Usage: npm run create-admin -- <username> <password> [display name]
// Needs serviceAccountKey.json (Firebase console -> Project settings -> Service accounts) in the project root.
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [username, password, displayName] = process.argv.slice(2);
if (!username || !password || password.length < 6) {
  console.error('Usage: npm run create-admin -- <username> <password (min 6 chars)>');
  process.exit(1);
}

const key = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(key) });

// Must match usernameToEmail() in src/lib/firebase.js
const email = `${username.trim().toLowerCase()}@pkot-cms.app`;
const auth = getAuth();

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password });
  console.log(`Updated password for existing admin "${username}"`);
} catch {
  user = await auth.createUser({ email, password, displayName: username });
  console.log(`Created admin "${username}"`);
}
await getFirestore()
  .doc(`admins/${user.uid}`)
  .set({ username: username.trim().toLowerCase(), ...(displayName ? { displayName: displayName.trim() } : {}), createdAt: FieldValue.serverTimestamp() });
console.log('Done. Log in to the CMS with that username and password.');
process.exit(0);
