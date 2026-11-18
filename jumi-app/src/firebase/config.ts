import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCYQn-_KsIj74IEjekhhCRTRIZ12ZsONmw",
    authDomain: "jumi-shopping-app.firebaseapp.com",
    projectId: "jumi-shopping-app",
    storageBucket: "jumi-shopping-app.firebasestorage.app",
    messagingSenderId: "925580502118",
    appId: "1:925580502118:web:7ac0a5ac13874f7c4239a7",
    measurementId: "G-3QCTB8J607"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };