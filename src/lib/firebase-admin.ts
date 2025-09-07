
import * as admin from 'firebase-admin';

const FIREBASE_DATABASE_ID = 'easy-order-items';

let app: admin.app.App;
let firestore: admin.firestore.Firestore;

if (admin.apps.length === 0) {
    try {
        app = admin.initializeApp({
            // Use Application Default Credentials
            credential: admin.credential.applicationDefault(),
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } catch(error: any) {
        console.error("Firebase Admin SDK initialization error", error);

        // Fallback for local development if GOOGLE_APPLICATION_CREDENTIALS is not set
        if (error.code === 'app/invalid-credential' && process.env.NODE_ENV === 'development') {
             console.warn("Attempting to initialize Firebase Admin SDK without credentials for local development.");
             app = admin.initializeApp();
        } else {
            throw error;
        }
    }
} else {
    app = admin.app();
}

firestore = admin.firestore(app);
firestore.settings({ databaseId: FIREBASE_DATABASE_ID });

export { app as adminApp, firestore as adminDb };
