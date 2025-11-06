'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Logo from '@/components/logo';

const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneSchema = z.object({
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
});

export default function SignupPage() {
  const router = useRouter();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', password: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  // Mock signup handler
  const handleSignup = () => {
    // In a real app, you would handle Firebase signup here.
    // For this scaffold, we'll just redirect to role selection.
    router.push('/role-selection');
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <Logo />
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">Create an Account</CardTitle>
          <CardDescription>Join Turf Eats and discover local flavors</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSignup)} className="space-y-4 pt-4">
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
                    Sign Up with Email
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="phone">
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(handleSignup)} className="space-y-4 pt-4">
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-bold">
                    Sign Up with Phone
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-sm">
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
