'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Utensils } from 'lucide-react';

export default function PostLoginPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    // Wait until the user object is loaded
    if (isUserLoading) {
      return;
    }

    // If no user, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    const checkUserProfile = async () => {
      const { uid } = user;
      
      // Define potential profile paths
      const customerRef = doc(firestore, `users/${uid}/customers/${uid}`);
      const driverRef = doc(firestore, `users/${uid}/drivers/${uid}`);
      const storeOwnerRef = doc(firestore, `users/${uid}/storeOwners/${uid}`);

      try {
        const customerDoc = await getDoc(customerRef);
        if (customerDoc.exists()) {
          router.replace('/dashboard');
          return;
        }

        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          router.replace('/driver/dashboard');
          return;
        }

        const storeOwnerDoc = await getDoc(storeOwnerRef);
        if (storeOwnerDoc.exists()) {
          router.replace('/owner/dashboard');
          return;
        }

        // If no profile is found, go to role selection
        router.replace('/role-selection');

      } catch (error) {
        console.error("Error checking user profile:", error);
        // Fallback to role selection on error
        router.replace('/role-selection');
      }
    };

    checkUserProfile();
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Utensils className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Signing you in...</p>
    </div>
  );
}
