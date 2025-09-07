
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
    firestore = admin.firestore(app);
    firestore.settings({ databaseId: FIREBASE_DATABASE_ID });
} else {
    app = admin.app();
    firestore = admin.firestore(app); // Ensure firestore is initialized in this case as well
    // Settings are typically sticky, so we might not need to set them again,
    // but it's safe to do so if we are unsure of the existing state.
    // Note: Calling settings on an already configured firestore might not be necessary
    // or could even throw an error depending on the exact state, but for this context it's safer.
    try {
        firestore.settings({ databaseId: FIREBASE_DATABASE_ID });
    } catch (e) {
        // Ignore errors if settings are already set.
    }
}

export { app as adminApp, firestore as adminDb };
