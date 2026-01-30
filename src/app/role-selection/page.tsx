'use client';

import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Bike, Store } from 'lucide-react';
import Logo from '@/components/logo';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ImageUploader from '@/components/image-uploader';


const roles = [
  {
    name: 'Customer',
    description: 'Order delicious food from local restaurants.',
    icon: <User className="h-12 w-12 text-primary" />,
    href: '/post-login', // Changed from /dashboard
    role: 'customer',
  },
  {
    name: 'Driver',
    description: 'Earn money by delivering food in your town.',
    icon: <Bike className="h-12 w-12 text-primary" />,
    href: '/driver/dashboard',
    role: 'driver',
  },
  {
    name: 'Store Owner',
    description: 'Manage your restaurant and reach more customers.',
    icon: <Store className="h-12 w-12 text-primary" />,
    href: '/owner/dashboard',
    role: 'storeOwner',
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isDriverDialogOpen, setDriverDialogOpen] = useState(false);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);

  const handleRoleSelection = async (role: string, href: string, options?: { licenseUrl?: string }) => {
    if (!user || !auth) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to select a role.',
      });
      router.push('/login');
      return;
    }

    try {
      const { uid, email, displayName, phoneNumber } = user;
      let profileData: any;
      let profilePath: string;
      let isPending = false;

      switch (role) {
        case 'customer':
          profilePath = `users/${uid}/customers/${uid}`;
          profileData = {
            id: uid,
            userId: uid,
            name: displayName || 'New Customer',
            email: email,
            phoneNumber: phoneNumber || '',
            address: '',
          };
          break;
        case 'driver':
          if (!options?.licenseUrl) {
              toast({ variant: 'destructive', title: 'Error', description: 'Driver\'s license is required.' });
              return;
          }
          isPending = true;
          profilePath = `users/${uid}/drivers/${uid}`;
          profileData = {
            id: uid,
            userId: uid,
            name: displayName || 'New Driver',
            phoneNumber: phoneNumber || '',
            vehicleType: '',
            licenseNumber: '',
            vehicleRegistration: '',
            licenseUrl: options.licenseUrl,
            status: 'pending'
          };
          break;
        case 'storeOwner':
          isPending = true;
          profilePath = `users/${uid}/storeOwners/${uid}`;
          profileData = {
            id: uid,
            userId: uid,
            name: displayName || 'New Store Owner',
            email: email,
            phoneNumber: phoneNumber || '',
            status: 'pending'
          };
          break;
        default:
          throw new Error('Invalid role selected');
      }
      
      const docRef = doc(firestore, profilePath);
      setDocumentNonBlocking(docRef, profileData, { merge: true });

      if (isPending) {
        toast({
          title: 'Application Submitted',
          description: `Your profile is pending review. We'll notify you upon approval.`,
          duration: 5000,
        });
        await signOut(auth);
        router.push('/login');
      } else {
        toast({
          title: 'Success!',
          description: `Your ${role} profile has been created.`,
        });
        // For customers, redirect to post-login to enforce email verification check
        router.push(href);
      }

    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Profile Creation Failed',
        description: error.message || 'Could not create your user profile.',
      });
    }
  };

  const handleDriverSubmit = () => {
    if (licenseUrl) {
      handleRoleSelection('driver', '/driver/dashboard', { licenseUrl });
      setDriverDialogOpen(false);
    }
  };

  const handleCardClick = (role: string, href: string) => {
    if (role === 'driver') {
      setLicenseUrl(null); // Reset on open
      setDriverDialogOpen(true);
    } else {
      handleRoleSelection(role, href);
    }
  };

  if (isUserLoading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <p>Loading...</p>
        </div>
    )
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <Logo />
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight">
          How will you use Turf Eats?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose your role to get started. You can change this later.
        </p>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {roles.map((role) => (
          <div key={role.name} onClick={() => handleCardClick(role.role, role.href)} className="cursor-pointer">
            <Card className="h-full transform transition-transform duration-300 hover:-translate-y-2 bg-primary/5 shadow-lg shadow-primary/10">
              <CardHeader className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  {role.icon}
                </div>
                <CardTitle className="font-headline text-xl font-bold">{role.name}</CardTitle>
                <CardDescription className="mt-1">{role.description}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>
      <Dialog open={isDriverDialogOpen} onOpenChange={setDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Driver Application</DialogTitle>
            <DialogDescription>
              To ensure the safety of our customers, please upload a clear image of your driver's license.
            </DialogDescription>
          </DialogHeader>
          <ImageUploader 
            folderName="driver-licenses"
            initialImageUrl={null}
            onUploadComplete={(url) => setLicenseUrl(url)}
          />
          <DialogFooter>
            <Button onClick={handleDriverSubmit} disabled={!licenseUrl}>
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
