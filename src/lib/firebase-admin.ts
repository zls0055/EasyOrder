
import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

const FIREBASE_DATABASE_ID = 'easy-order-items';

// This will be our singleton instance
let firebaseAdmin: { app: admin.app.App, db: admin.firestore.Firestore } | null = null;
const key: string = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || ''
const serviceAccount = JSON.parse(key);

/**
 * Initializes and/or returns the Firebase Admin SDK instances.
 * This function ensures that initializeApp is called only once.
 * @returns An object containing the admin app and the firestore db instance.
 */
export function getFirebaseAdmin() {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: cert(serviceAccount)
        // credential: admin.credential.cert(serviceAccount)
        // The SDK will automatically detect Google Application Default Credentials
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      console.error('Firebase admin initialization error', error.stack);
      // If initialization fails, we should not proceed.
      // Re-throwing the error might be a good idea depending on desired behavior.
      throw new Error('Failed to initialize Firebase Admin SDK.');
    }
  }

  const app = admin.app();
  const db = admin.firestore(app);

  try {
    db.settings({ 
      databaseId: FIREBASE_DATABASE_ID
    });
  } catch (e) {
    if ((e as any).code !== 'failed-precondition') {
      console.error('Firestore settings error:', e);
    }
  }
  
  firebaseAdmin = { app, db };
  return firebaseAdmin;
}

// For convenience, you can destructure the exports if you want the old feel
const { app: adminApp, db: adminDb } = getFirebaseAdmin();

export { adminApp, adminDb };
