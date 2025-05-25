
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

if (
  !apiKey ||
  apiKey === "YOUR_ACTUAL_API_KEY" || 
  (typeof apiKey === 'string' && apiKey.startsWith("YOUR_ACTUAL_")) || 
  !authDomain ||
  !projectId ||
  !storageBucket ||
  !messagingSenderId ||
  !appId
) {
  console.error(
    "**********************************************************************************\n" +
    "CRITICAL Firebase Configuration Error:\n" +
    "One or more Firebase environment variables are missing or still using placeholder values.\n" +
    "Please ensure your .env file at the root of your project is correctly populated with your actual Firebase project credentials.\n" +
    "The application will not function correctly until this is resolved.\n" +
    "Detected NEXT_PUBLIC_FIREBASE_API_KEY: " + apiKey + "\n" +
    "**********************************************************************************"
  );
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
};

// Log the config to the server console for debugging
console.log("Firebase Config Being Used:", JSON.stringify(firebaseConfig, null, 2));

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

authInstance = getAuth(app);
const firestore = getFirestore(app);
dbInstance = firestore; // Assign to the exported 'db'
storageInstance = getStorage(app);

// Attempt to enable offline persistence for Firestore
enableIndexedDbPersistence(firestore)
  .then(() => {
    console.log("Firebase Firestore offline persistence has been enabled. The app can now work with cached data offline.");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn(
        "Firebase Firestore offline persistence could not be enabled in this tab. " +
        "This is likely because multiple tabs of the app are open, or due to an existing persistence lease from another tab. " +
        "Offline capabilities may be limited or unavailable in this specific tab. Closing other tabs might resolve this."
      );
    } else if (err.code === 'unimplemented') {
      console.error(
        "Firebase Firestore offline persistence is not supported in this browser environment. " +
        "The app will not be able to cache data for offline use."
      );
    } else {
      console.error("An error occurred while enabling Firebase Firestore offline persistence: ", err);
    }
  });

export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
