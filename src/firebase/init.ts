import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  // Check if all required config values are present.
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    // This will now provide a much clearer error in the Vercel logs.
    console.error("Firebase config is incomplete. Check your NEXT_PUBLIC_ environment variables in Vercel.", firebaseConfig);
    throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
  }
  
  // Initialize Firebase, but only if it hasn't been initialized already.
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  const bucketUrl = firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined;

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app, bucketUrl)
  };
}
