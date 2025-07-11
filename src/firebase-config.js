// src/firebase-config.js

import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_KLJ8acvdI37vKAdB8ygv_qgKRZ4KU6A",
  authDomain: "business-management-syst-34a78.firebaseapp.com",
  projectId: "business-management-syst-34a78",
  storageBucket: "business-management-syst-34a78.appspot.com", // Corregí el .firebasestorage.app a .appspot.com que es el más común
  messagingSenderId: "774607670798",
  appId: "1:774607670798:web:f395132efe09dfd3a4f65f"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);