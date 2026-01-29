'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Utensils } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function PostLoginPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Wait until the user object is loaded
    if (isUserLoading || !firestore || !auth) {
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
        // 1. Check for Customer profile
        const customerDoc = await getDoc(customerRef);
        if (customerDoc.exists()) {
          router.replace('/dashboard');
          return;
        }

        // 2. Check for Driver profile and status
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          if (driverData.status === 'pending') {
            await signOut(auth);
            toast({
              title: 'Application Pending',
              description: 'Your driver application is still under review. We will notify you once it is approved.',
              duration: 8000,
            });
            router.replace('/login');
            return;
          }
          if (driverData.status === 'inactive') {
             await signOut(auth);
             toast({
              variant: 'destructive',
              title: 'Account Inactive',
              description: 'Your driver account has been deactivated. Please contact support.',
              duration: 8000,
            });
             router.replace('/login');
             return;
          }
          router.replace('/driver/dashboard');
          return;
        }

        // 3. Check for Store Owner profile and status
        const storeOwnerDoc = await getDoc(storeOwnerRef);
        if (storeOwnerDoc.exists()) {
          const ownerData = storeOwnerDoc.data();
           if (ownerData.status === 'pending') {
            await signOut(auth);
            toast({
              title: 'Application Pending',
              description: 'Your store application is still under review. We will notify you once it is approved.',
              duration: 8000,
            });
            router.replace('/login');
            return;
          }
           if (ownerData.status === 'inactive') {
             await signOut(auth);
             toast({
              variant: 'destructive',
              title: 'Account Inactive',
              description: 'Your store account has been deactivated. Please contact support.',
              duration: 8000,
            });
             router.replace('/login');
             return;
          }
          router.replace('/owner/dashboard');
          return;
        }

        // 4. If no profile is found, go to role selection
        router.replace('/role-selection');

      } catch (error) {
        console.error("Error checking user profile:", error);
        // Fallback to role selection on error
        router.replace('/role-selection');
      }
    };

    checkUserProfile();
  }, [user, isUserLoading, firestore, router, auth, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Utensils className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Signing you in...</p>
    </div>
  );
}
