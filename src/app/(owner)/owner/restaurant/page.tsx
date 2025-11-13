'use client';

import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  address: z.string().min(10, 'Address is too short'),
  category: z.string({ required_error: 'Please select a category.' }),
  openingTime: z.string({ required_error: 'Please select an opening time.' }),
  closingTime: z.string({ required_error: 'Please select a closing time.' }),
  logoUrl: z.string().url('Must be a valid URL'),
  bannerUrl: z.string().url('Must be a valid URL'),
});

type RestaurantFormValues = z.infer<typeof restaurantSchema>;

const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes} ${period}`;
});

const categories = [
    'Fast Food',
    'Breakfast and Brunch',
    'Pizza',
    'Burgers',
    'Healthy',
    'Grocery',
    'Diner',
    'Cafe',
    'Italian',
    'Mexican',
    'Japanese',
    'Desserts',
];


export default function RestaurantDetailsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  // A store owner's user ID is the same as their restaurant's document ID.
  const restaurantId = user?.uid;

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);

  const { data: restaurantData, isLoading } = useDoc<Restaurant>(restaurantRef);

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: '',
      address: '',
      category: '',
      openingTime: '9:00 AM',
      closingTime: '10:00 PM',
      logoUrl: '',
      bannerUrl: '',
    },
  });

  useEffect(() => {
    if (restaurantData) {
        const dataWithHours = {
            ...restaurantData,
            openingTime: restaurantData.openingHours?.split(' - ')[0] || '9:00 AM',
            closingTime: restaurantData.openingHours?.split(' - ')[1] || '10:00 PM'
        }
      form.reset(dataWithHours);
    }
  }, [restaurantData, form]);

  const onSubmit = (data: RestaurantFormValues) => {
    if (!restaurantRef || !restaurantId) return;
    
    const { openingTime, closingTime, ...restData } = data;

    const submissionData = {
        ...restData,
        id: restaurantId, // Ensure the ID field is in the document data
        storeOwnerId: restaurantId,
        openingHours: `${openingTime} - ${closingTime}`,
    }

    setDocumentNonBlocking(restaurantRef, submissionData, { merge: true });

    toast({
      title: 'Restaurant Updated',
      description: 'Your restaurant details have been saved.',
    });

    router.push('/owner/dashboard');
  };

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold">My Restaurant</h1>
          <p className="mt-2 text-muted-foreground">Update your restaurant's public information.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Details</CardTitle>
            <CardDescription>This information will be visible to customers.</CardDescription>
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
                        <FormLabel>Restaurant Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              {categories.map(category => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="openingTime"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Opening Time</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a time" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {timeOptions.map(time => (
                                        <SelectItem key={`open-${time}`} value={time}>{time}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="closingTime"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Closing Time</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a time" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {timeOptions.map(time => (
                                        <SelectItem key={`close-${time}`} value={time}>{time}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                   <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/logo.png" />
                        </FormControl>
                         <FormDescription>
                            Provide a link to a hosted image. You can use a free service like Imgur.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bannerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banner Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/banner.png" />
                        </FormControl>
                         <FormDescription>
                            Provide a link to a hosted image. This will appear at the top of your restaurant page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
