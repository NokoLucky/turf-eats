
'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useAuth } from '@/firebase';
import { getFriendlyErrorMessage } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { LogOut, ShieldCheck, FileText, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import FreeAddressAutocomplete from '@/components/free-address-autocomplete';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email({ message: "A valid email is required if provided." }).or(z.literal("")).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();
  const { theme, setTheme } = useTheme();

  const customerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/customers/${user.uid}`);
  }, [user, firestore]);

  const { data: customerData, isLoading: isCustomerLoading } = useDoc<ProfileFormValues>(customerRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      address: '',
      email: '',
    },
  });

  useEffect(() => {
    if (customerData) {
      form.reset({
        ...customerData,
        email: customerData.email || '',
        phoneNumber: customerData.phoneNumber || '',
        address: customerData.address || '',
      });
    } else if (user) {
        form.reset({
            ...form.getValues(),
            email: user.email || '',
            name: user.displayName || '',
            phoneNumber: user.phoneNumber || '',
        })
    }
  }, [customerData, user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!customerRef) return;
    
    setDocumentNonBlocking(customerRef, data, { merge: true });

    toast({
      title: 'Profile Updated',
      description: 'Your information has been successfully saved.',
    });
  };

  const handleSignOut = async () => {
    try {
        await signOut(auth);
        toast({
            title: 'Signed Out',
            description: "You have been successfully signed out."
        });
        router.push('/login');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Sign Out Failed',
            description: getFriendlyErrorMessage(error)
        });
    }
  };

  const isLoading = isUserLoading || isCustomerLoading;

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold">My Profile</h1>
          <p className="mt-2 text-muted-foreground">View and update your account details.</p>
        </div>
        
        <div className="space-y-6">
          <Card className="border-none shadow-premium rounded-[2rem]">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Manage your name, contact, and delivery information.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly disabled className="rounded-xl bg-muted/50" />
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
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Address</FormLabel>
                          <FormControl>
                             <FreeAddressAutocomplete
                                value={field.value}
                                onChange={field.onChange}
                              />
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
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium rounded-[2rem]">
            <CardHeader>
              <CardTitle>Display Preference</CardTitle>
              <CardDescription>Choose how you want Pin2You to look.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                <div>
                  <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Sun className="mb-2 h-6 w-6" />
                    <span className="text-xs font-bold uppercase">Light</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Moon className="mb-2 h-6 w-6" />
                    <span className="text-xs font-bold uppercase">Dark</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
                  <Label
                    htmlFor="theme-system"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Monitor className="mb-2 h-6 w-6" />
                    <span className="text-xs font-bold uppercase">System</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium rounded-[2rem]">
            <CardHeader>
              <CardTitle>Legal & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button asChild variant="ghost" className="w-full justify-between h-14 rounded-xl px-4">
                <Link href="/legal/terms">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Terms of Service</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-between h-14 rounded-xl px-4">
                <Link href="/legal/privacy">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Privacy Policy</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
               <Separator className="my-6" />
               <Button onClick={handleSignOut} variant="outline" className="w-full rounded-xl h-12 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
