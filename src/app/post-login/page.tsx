
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Utensils } from 'lucide-react';
import { signOut } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PostLoginPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');

  const handleDialogClose = async () => {
    setDialogOpen(false);
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }
    router.replace('/login');
  };

  useEffect(() => {
    if (isUserLoading || !firestore || !auth) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    const checkUserProfile = async () => {
      const { uid } = user;
      
      try {
        // 1. Check for Admin profile first
        const adminRef = doc(firestore, `admins/${uid}`);
        const adminDoc = await getDoc(adminRef);
        if (adminDoc.exists()) {
          router.replace('/admin/dashboard');
          return;
        }

        // 2. Check for Customer profile
        const customerRef = doc(firestore, `users/${uid}/customers/${uid}`);
        const customerDoc = await getDoc(customerRef);
        if (customerDoc.exists()) {
          if (user.email && !user.emailVerified) {
            setDialogTitle('Email Not Verified');
            setDialogDescription('A verification link has been sent to your email. Please verify your account to continue.');
            setDialogOpen(true);
            return;
          }
          router.replace('/dashboard');
          return;
        }

        // 3. Check for Driver profile and status
        const driverRef = doc(firestore, `users/${uid}/drivers/${uid}`);
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          if (driverData.status === 'pending') {
            setDialogTitle('Application Pending');
            setDialogDescription('Your driver application is still under review. We will notify you once it is approved.');
            setDialogOpen(true);
            return;
          }
          if (driverData.status === 'inactive') {
            setDialogTitle('Account Inactive');
            setDialogDescription('Your driver account has been deactivated. Please contact support.');
            setDialogOpen(true);
            return;
          }
          router.replace('/driver/dashboard');
          return;
        }

        // 4. Check for Store Owner profile and status
        const storeOwnerRef = doc(firestore, `users/${uid}/storeOwners/${uid}`);
        const storeOwnerDoc = await getDoc(storeOwnerRef);
        if (storeOwnerDoc.exists()) {
          const ownerData = storeOwnerDoc.data();
           if (ownerData.status === 'pending') {
            setDialogTitle('Application Pending');
            setDialogDescription('Your store application is still under review. We will notify you once it is approved.');
            setDialogOpen(true);
            return;
          }
           if (ownerData.status === 'inactive') {
             setDialogTitle('Account Inactive');
             setDialogDescription('Your store account has been deactivated. Please contact support.');
             setDialogOpen(true);
             return;
          }
          router.replace('/owner/dashboard');
          return;
        }

        // 5. If no profile is found, go to role selection
        router.replace('/role-selection');

      } catch (error) {
        console.error("Error checking user profile:", error);
        router.replace('/role-selection');
      }
    };

    checkUserProfile();
  }, [user, isUserLoading, firestore, router, auth]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleDialogClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isDialogOpen && (
        <>
          <Utensils className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Signing you in...</p>
        </>
      )}
    </div>
  );
}
