
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

if (
  !apiKey ||
  apiKey === "YOUR_ACTUAL_API_KEY" || // Check for the exact placeholder string
  (typeof apiKey === 'string' && apiKey.startsWith("YOUR_ACTUAL_")) || // Check for variations
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
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };
