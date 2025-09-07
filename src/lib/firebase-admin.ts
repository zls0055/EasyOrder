
import * as admin from 'firebase-admin';

const FIREBASE_DATABASE_ID = 'easy-order-items';

let app: admin.app.App;
let firestore: admin.firestore.Firestore;

if (admin.apps.length === 0) {
    try {
        // Check if applicationDefault is available before using it.
        const credential = admin.credential.applicationDefault ? admin.credential.applicationDefault() : undefined;
        
        app = admin.initializeApp({
            credential,
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
    app = admin.app()!;
}

firestore = admin.firestore(app);
try {
    firestore.settings({ databaseId: FIREBASE_DATABASE_ID });
} catch(e) {
    // Ignore error if settings are already set
}


export { app as adminApp, firestore as adminDb };
