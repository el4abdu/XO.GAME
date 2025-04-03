// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqDw3gBxPQWwdqjySIFmlza8cvjg2V9zw",
  authDomain: "xogame-94c8b.firebaseapp.com",
  databaseURL: "https://xogame-94c8b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "xogame-94c8b",
  storageBucket: "xogame-94c8b.firebasestorage.app",
  messagingSenderId: "806770328963",
  appId: "1:806770328963:web:7f132c2d939907d60d22b6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

// Export for use in other files
window.database = database; 