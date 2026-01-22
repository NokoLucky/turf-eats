import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

// This is the robust way to initialize Firebase, ensuring it's only done once.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export function initializeFirebase() {
  // Explicitly provide the storage bucket URL to getStorage to prevent initialization errors.
  const bucketUrl = firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined;

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app, bucketUrl)
  };
}
