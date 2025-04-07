import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFqHwNqGk0Utiq2umPZ9hKny2ZnVNuci4",
  authDomain: "sketchmentor-6ec65.firebaseapp.com",
  projectId: "sketchmentor-6ec65",
  storageBucket: "sketchmentor-6ec65.firebasestorage.app",
  messagingSenderId: "984767234188",
  appId: "1:984767234188:web:7185264863e5d6eb3d3ba9",
  measurementId: "G-5LQ0VJCPGH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };