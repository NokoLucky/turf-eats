'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Logo from '@/components/logo';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/firebase/errors';

const emailSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number, including the country code (e.g. +27).' }),
});

const codeSchema = z.object({
  code: z.string().length(6, { message: 'Verification code must be 6 digits.'})
})


export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [phoneAuthState, setPhoneAuthState] = useState<'enter-phone' | 'enter-code'>('enter-phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [pendingName, setPendingName] = useState('');

  useEffect(() => {
    if (!auth) return;
    
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, [auth]);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { name: '', phone: '' },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const handleSignup = async (values: z.infer<typeof emailSchema>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        // Set the display name immediately
        await updateProfile(userCredential.user, { displayName: values.name });
        
        await sendEmailVerification(userCredential.user);
        toast({
            title: 'Account Created!',
            description: 'Check your inbox to verify your email address.',
        });
      }
      // Pass the phone number to role selection since email auth doesn't store it
      router.push(`/role-selection?phone=${encodeURIComponent(values.phone)}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign-up Failed',
        description: getFriendlyErrorMessage(error),
      });
    }
  };

  const handlePhoneSignup = async (values: z.infer<typeof phoneSchema>) => {
    try {
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, values.phone, verifier);
      setConfirmationResult(result);
      setPendingName(values.name);
      setPhoneAuthState('enter-code');
      toast({ title: "Verification Code Sent", description: "Please enter the code sent to your phone to complete signup."});
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not send code',
        description: getFriendlyErrorMessage(error),
      });
    }
  };

  const handleVerifyCode = async (values: z.infer<typeof codeSchema>) => {
    if (!confirmationResult) return;
    try {
      const userCredential = await confirmationResult.confirm(values.code);
      if (userCredential.user) {
          await updateProfile(userCredential.user, { displayName: pendingName });
      }
      router.push('/role-selection');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'The code was incorrect. Please try again.',
      });
    }
  }


  return (
    <div className="flex flex-col items-center gap-8">
      <Logo />
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">Create an Account</CardTitle>
          <CardDescription>Join Pin2You and discover local services</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsContent value="email" className="min-h-[16rem]">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSignup)} className="space-y-4 pt-4">
                  <FormField
                    control={emailForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={emailForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+27 ..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-bold">
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/legal/terms" className="underline hover:text-primary">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
