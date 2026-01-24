// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBqJNXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "educare-b132a.firebaseapp.com",
  databaseURL: "https://educare-b132a-default-rtdb.firebaseio.com",
  projectId: "educare-b132a",
  storageBucket: "educare-b132a.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};

console.log('Firebase config:', firebaseConfig);

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Initialize Realtime Database and get a reference to the service
let database;
try {
  database = getDatabase(app);
  console.log('Firebase database initialized successfully');
} catch (error) {
  console.error('Firebase database initialization error:', error);
  throw error;
}

// Initialize Firebase Storage
let storage;
try {
  storage = getStorage(app);
  console.log('Firebase storage initialized successfully');
} catch (error) {
  console.error('Firebase storage initialization error:', error);
  throw error;
}

export { database, storage };
export default app;