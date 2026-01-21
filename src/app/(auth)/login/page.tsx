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
import { signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneSchema = z.object({
  phone: z.string().min(10, { message: 'Please enter a valid phone number, including the country code (e.g. +27).' }),
});

const codeSchema = z.object({
  code: z.string().length(6, { message: 'Verification code must be 6 digits.'})
})

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [phoneAuthState, setPhoneAuthState] = useState<'enter-phone' | 'enter-code'>('enter-phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!auth) return;
    
    // Set up reCAPTCHA. This is invisible and helps prevent abuse.
    // It's attached to the window object to avoid re-creating it on every render.
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, [auth]);


  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', password: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const handleLogin = async (values: z.infer<typeof emailSchema>) => {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/post-login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handlePhoneLogin = async (values: z.infer<typeof phoneSchema>) => {
    try {
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, values.phone, verifier);
      setConfirmationResult(result);
      setPhoneAuthState('enter-code');
      toast({ title: "Verification Code Sent", description: "Please enter the code sent to your phone."});
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not send code',
        description: error.message || 'Please check the phone number and try again.',
      });
    }
  };

  const handleVerifyCode = async (values: z.infer<typeof codeSchema>) => {
    if (!confirmationResult) return;
    try {
      await confirmationResult.confirm(values.code);
      router.push('/post-login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'The code was incorrect. Please try again.',
      })
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <Logo />
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue to Turf Eats</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="min-h-[20rem]">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleLogin)} className="space-y-4 pt-4">
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
                    Sign In with Email
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="phone" className="min-h-[20rem]">
               {phoneAuthState === 'enter-phone' ? (
                <Form {...phoneForm}>
                  <form key="phone-form" onSubmit={phoneForm.handleSubmit(handlePhoneLogin)} className="space-y-4 pt-4">
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+27 12 345 6789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full font-bold">
                      Send Verification Code
                    </Button>
                  </form>
                </Form>
              ) : (
                 <Form {...codeForm}>
                  <form key="code-form" onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-4 pt-4">
                    <FormField
                      control={codeForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} autoComplete="one-time-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full font-bold">
                      Verify & Sign In
                    </Button>
                     <Button variant="link" type="button" onClick={() => setPhoneAuthState('enter-phone')} className="w-full">
                      Use a different number
                    </Button>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
