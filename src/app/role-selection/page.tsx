'use client';

import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Bike, Store } from 'lucide-react';
import Logo from '@/components/logo';
import { useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase';

const roles = [
  {
    name: 'Customer',
    description: 'Order delicious food from local restaurants.',
    icon: <User className="h-12 w-12 text-primary" />,
    href: '/dashboard',
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
  const { toast } = useToast();

  const handleRoleSelection = async (role: string, href: string) => {
    if (!user) {
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
          profilePath = `users/${uid}/drivers/${uid}`;
          profileData = {
            id: uid,
            userId: uid,
            name: displayName || 'New Driver',
            phoneNumber: phoneNumber || '',
            vehicleType: '',
            licenseNumber: '',
            vehicleRegistration: '',
          };
          break;
        case 'storeOwner':
          profilePath = `users/${uid}/storeOwners/${uid}`;
          profileData = {
            id: uid,
            userId: uid,
            name: displayName || 'New Store Owner',
            email: email,
            phoneNumber: phoneNumber || '',
          };
          break;
        default:
          throw new Error('Invalid role selected');
      }
      
      const docRef = doc(firestore, profilePath);
      setDocumentNonBlocking(docRef, profileData, { merge: true });

      toast({
        title: 'Success!',
        description: `Your ${role} profile has been created.`,
      });

      router.push(href);

    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Profile Creation Failed',
        description: error.message || 'Could not create your user profile.',
      });
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
          <div key={role.name} onClick={() => handleRoleSelection(role.role, role.href)} className="cursor-pointer">
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
    </div>
  );
}
