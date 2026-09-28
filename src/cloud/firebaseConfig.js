// Public web-app configuration; Firestore rules protect access, not this config.
export const firebaseConfig = {
  messagingSenderId: "1093654679193",
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyAIJsfzZLBTYTKoPcf__wyVTX30q84XC0Y",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "saitama-workout-ff2d5.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "saitama-workout-ff2d5",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:1093654679193:web:fdc265df2f247be1e8b208",
};
export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
