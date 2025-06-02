// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhbQ31yshabFGe5NboFVlZ1Y-EoiMxMH8",
  authDomain: "tucano-financas.firebaseapp.com",
  projectId: "tucano-financas",
  storageBucket: "tucano-financas.firebasestorage.app",
  messagingSenderId: "1019303643751",
  appId: "1:1019303643751:web:7b93d3754525e5f87162c2",
  measurementId: "G-FC2Q0QMYBX",
  databaseURL: "https://tucano-financas-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export auth and database instances
export const auth = getAuth(app);
export const database = getDatabase(app);