import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Hardcoded Firebase Config to ensure stability across deployments
// These are public keys and safe to be in client-side code
const firebaseConfig = {
  apiKey: "AIzaSyBqvxiUfVB15RXFVXBxZo9qA6pf5oCNmn4",
  authDomain: "tts2004evaluation.firebaseapp.com",
  projectId: "tts2004evaluation",
  storageBucket: "tts2004evaluation.firebasestorage.app",
  messagingSenderId: "908218732176",
  appId: "1:908218732176:web:f599384ab1848a105ed215",
};

console.log("🔥 Firebase Config Loaded Project ID:", firebaseConfig.projectId);

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 👇 จุดเปลี่ยนสำคัญ: ใช้ getFirestore(app) ปกติ เพื่อความเข้ากับ Emulator ได้ดีที่สุด
export const db = getFirestore(app);

// 🔌 Emulator Connection Logic
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  console.log("🛠️ Using Firebase Emulators");
  // Connect Auth Emulator
  connectAuthEmulator(auth, "http://127.0.0.1:9099");

  // Connect Firestore Emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}