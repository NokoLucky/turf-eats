import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  let app: FirebaseApp;
  if (!getApps().length) {
    // When deploying to environments other than Firebase Hosting, like Vercel,
    // you must provide the config object to initializeApp.
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Explicitly provide the storage bucket URL to getStorage to prevent initialization errors.
  const bucketUrl = firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined;

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp, bucketUrl)
  };
}
