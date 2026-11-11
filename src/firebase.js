import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyCQh9V15fkfD5fJtz2_FDjAOQ48lSjWtnM",

  authDomain: "loanrecoverapp.firebaseapp.com",

  projectId: "loanrecoverapp",

  storageBucket: "loanrecoverapp.firebasestorage.app",

  messagingSenderId: "706407971775",

  appId: "1:706407971775:web:0efe36dfc2b9489f8d3f0a",

  measurementId: "G-C77E348GXR"

};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
