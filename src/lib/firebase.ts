import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPd8bO_HhcrNcV6qxkclrh_Np2N3fypP8",
  authDomain: "easyorder-b95sc.firebaseapp.com",
  projectId: "easyorder-b95sc",
  storageBucket: "easyorder-b95sc.firebasestorage.app",
  messagingSenderId: "805060760707",
  appId: "1:805060760707:web:a4627e703995f3ff95b7b6"
};

const appName = "easy-order-items";

function getAppInstance(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

// Using a global variable to cache the Firestore instance
// This helps prevent re-initialization issues in server environments
declare global {
  // eslint-disable-next-line no-var
  var firestoreInstance: Firestore | undefined;
}

function getDbInstance(): Firestore {
  if (typeof window !== 'undefined') {
    // Client-side initialization
    const app = getAppInstance();
    // Use initializeFirestore to connect to a specific database ID
    return initializeFirestore(app, {}, appName);
  } else {
    // Server-side, use a global cache
    if (!global.firestoreInstance) {
      const app = getAppInstance();
      global.firestoreInstance = initializeFirestore(app, {}, appName);
    }
    return global.firestoreInstance;
  }
}

const app: FirebaseApp = getAppInstance();
const db: Firestore = getDbInstance();

export { app, db };
