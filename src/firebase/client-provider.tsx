'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase/init';

// Define the type for the services object
type FirebaseServices = ReturnType<typeof initializeFirebase>;

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after initial render.
    // This is where window and process.env are reliably available.
    if (typeof window !== 'undefined') {
      setFirebaseServices(initializeFirebase());
    }
  }, []); // Empty dependency array ensures this runs only once on mount.

  // Don't render children until Firebase is initialized.
  // This prevents children from trying to access Firebase context that isn't ready.
  if (!firebaseServices) {
    // You can optionally return a loading spinner here.
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
