// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBanUc9WduHlFQHBrAAdkN3jYeXJCgSvDM",
    authDomain: "poc-firebase-74b44.firebaseapp.com",
    projectId: "poc-firebase-74b44",
    storageBucket: "poc-firebase-74b44.firebasestorage.app",
    messagingSenderId: "411146945820",
    appId: "1:411146945820:web:7ef1e9972eabd012c2a6d9",
    measurementId: "G-9TZKWFNSR5"
  };

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { analytics, logEvent, db };
