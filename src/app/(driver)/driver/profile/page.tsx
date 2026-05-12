'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useAuth } from '@/firebase';
import { getFriendlyErrorMessage } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { LogOut } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().optional(),
  vehicleType: z.string().min(2, { message: 'Vehicle type must be at least 2 characters.' }),
  licenseNumber: z.string().min(2, { message: 'License number must be at least 2 characters.' }),
  vehicleRegistration: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function DriverProfilePage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const driverRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/drivers/${user.uid}`);
  }, [user, firestore]);

  const { data: driverData, isLoading: isDriverLoading } = useDoc<ProfileFormValues>(driverRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      vehicleType: '',
      licenseNumber: '',
      vehicleRegistration: '',
    },
  });

  useEffect(() => {
    if (driverData) {
      form.reset(driverData);
    } else if (user) {
        form.reset({
            ...form.getValues(),
            name: user.displayName || '',
            phoneNumber: user.phoneNumber || ''
        })
    }
  }, [driverData, user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!driverRef) return;
    
    setDocumentNonBlocking(driverRef, data, { merge: true });

    toast({
      title: 'Profile Updated',
      description: 'Your information has been successfully saved.',
    });
  };

  const handleSignOut = async () => {
    try {
        if (auth) {
            await signOut(auth);
            toast({
                title: 'Signed Out',
                description: "You have been successfully signed out."
            });
            router.push('/login');
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Sign Out Failed',
            description: getFriendlyErrorMessage(error)
        });
    }
  };

  const isLoading = isUserLoading || isDriverLoading;

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold">My Driver Profile</h1>
          <p className="mt-2 text-muted-foreground">View and update your account details.</p>
        </div>
        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader>
            <CardTitle>Driver Information</CardTitle>
            <CardDescription>Manage your name, contact, and vehicle information.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Scooter, Sedan, Hatchback" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver's License Number</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vehicleRegistration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABC 123 GP" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-xl px-8 font-bold">
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
             <Separator className="my-6" />
             <Button onClick={handleSignOut} variant="outline" className="w-full rounded-xl">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
