import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// 👇 จุดเปลี่ยนสำคัญ: ใส่ 'default' เป็นพารามิเตอร์ตัวที่ 2
// เพื่อบอกให้ Code วิ่งไปที่ Database ชื่อ "default" (แบบไม่มีวงเล็บ) โดยตรง
export const db = getFirestore(app, 'default');