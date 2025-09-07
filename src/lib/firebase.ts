
'use client';

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, onSnapshot, collection, query, orderBy, limit, Timestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPd8bO_HhcrNcV6qxkclrh_Np2N3fypP8",
  authDomain: "easyorder-b95sc.firebaseapp.com",
  projectId: "easyorder-b95sc",
  storageBucket: "easyorder-b95sc.firebasestorage.app",
  messagingSenderId: "805060760707",
  appId: "1:805060760707:web:a4627e703995f3ff95b7b6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app, "easy-order-items");

export { app, db, onSnapshot, collection, query, orderBy, limit, Timestamp };
