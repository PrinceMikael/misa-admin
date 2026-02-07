/**
 * Firebase Admin Setup Script
 * Run: node setup-admin.js
 *
 * This script creates the admin user in Firebase Auth and Firestore
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Download serviceAccountKey.json from Firebase Console → Project Settings → Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  const email = 'jackson@primaxtz.com';
  const password = 'qwertyuiop';
  const parishId = 'parish_001';

  try {
    console.log('Creating admin user...');

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: 'Jackson Admin',
    });

    console.log('✓ User created in Firebase Auth');
    console.log('  UID:', userRecord.uid);
    console.log('  Email:', userRecord.email);

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'PARISH_ADMIN',
      parishId: parishId,
      displayName: 'Jackson Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✓ User document created in Firestore');
    console.log('\n✅ Admin user setup complete!');
    console.log('\nLogin credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('  Parish ID:', parishId);
    console.log('\n⚠️  Remember to change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);

    if (error.code === 'auth/email-already-exists') {
      console.log('\n💡 User already exists. Trying to update Firestore document...');

      // Get existing user
      const userRecord = await auth.getUserByEmail(email);

      // Update Firestore document
      await db.collection('users').doc(userRecord.uid).set({
        email: email,
        role: 'PARISH_ADMIN',
        parishId: parishId,
        displayName: 'Jackson Admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('✓ Firestore document updated');
      console.log('\nLogin credentials:');
      console.log('  Email:', email);
      console.log('  Password:', password);
      console.log('  Parish ID:', parishId);
    }

    process.exit(1);
  }
}

createAdminUser();
