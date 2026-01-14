'use client';

import { useEffect, useMemo } from 'react';
import { collection, doc, query, where, limit } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FreeAddressAutocomplete from '@/components/free-address-autocomplete';
import ImageUploader from '@/components/image-uploader';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  address: z.string().min(10, 'Address is too short'),
  category: z.string({ required_error: 'Please select a category.' }),
  openingTime: z.string({ required_error: 'Please select an opening time.' }),
  closingTime: z.string({ required_error: 'Please select a closing time.' }),
  logoUrl: z.string().url('A logo upload is required.').min(1, 'A logo upload is required.'),
  bannerUrl: z.string().url('A banner upload is required.').min(1, 'A banner upload is required.'),
});

type RestaurantFormValues = z.infer<typeof restaurantSchema>;


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

  const restaurantQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'restaurants'), where('storeOwnerId', '==', user.uid), limit(1));
  }, [user, firestore]);

  const { data: restaurantData, isLoading: isRestaurantLoading } = useCollection<Restaurant>(restaurantQuery);
  const existingRestaurant = restaurantData?.[0];

  const timeOptions = useMemo(() => Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes} ${period}`;
  }), []);

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
    if (existingRestaurant) {
        const dataWithHours = {
            ...existingRestaurant,
            openingTime: existingRestaurant.openingHours?.split(' - ')[0] || '9:00 AM',
            closingTime: existingRestaurant.openingHours?.split(' - ')[1] || '10:00 PM'
        }
      form.reset(dataWithHours);
    }
  }, [existingRestaurant, form]);

  const onSubmit = (data: RestaurantFormValues) => {
    if (!user || !firestore) return;
    
    const { openingTime, closingTime, ...restData } = data;

    const submissionData = {
        ...restData,
        storeOwnerId: user.uid, // Ensure owner ID is set
        openingHours: `${openingTime} - ${closingTime}`,
        rating: existingRestaurant?.rating || Math.floor(Math.random() * 2) + 3.5, // Preserve or set default
    };

    if (existingRestaurant) {
        // Update existing restaurant
        const restaurantRef = doc(firestore, 'restaurants', existingRestaurant.id);
        setDocumentNonBlocking(restaurantRef, submissionData, { merge: true });
        toast({
            title: 'Restaurant Updated',
            description: 'Your restaurant details have been saved.',
        });
    } else {
        // Create new restaurant
        const restaurantsCollectionRef = collection(firestore, 'restaurants');
        addDocumentNonBlocking(restaurantsCollectionRef, submissionData);
         toast({
            title: 'Restaurant Created!',
            description: 'Your new restaurant has been saved.',
        });
    }

    router.refresh();
  };

  const isLoading = !firestore || isRestaurantLoading;

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold">My Restaurant</h1>
          <p className="mt-2 text-muted-foreground">
            {existingRestaurant ? "Update your restaurant's public information." : "Create your restaurant profile."}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Details</CardTitle>
            <CardDescription>This information will be visible to customers.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !form.formState.isDirty ? (
              <div className="space-y-4 pt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
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
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                           <FreeAddressAutocomplete
                              value={field.value}
                              onChange={field.onChange}
                            />
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                        <FormLabel>Logo Image</FormLabel>
                        <FormControl>
                          <ImageUploader 
                            onUploadComplete={(url) => field.onChange(url)}
                            initialImageUrl={field.value}
                            folderName="restaurant-logos"
                           />
                        </FormControl>
                         <FormDescription>
                            Upload your restaurant's logo.
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
                        <FormLabel>Banner Image</FormLabel>
                        <FormControl>
                           <ImageUploader 
                            onUploadComplete={(url) => field.onChange(url)}
                            initialImageUrl={field.value}
                            folderName="restaurant-banners"
                           />
                        </FormControl>
                         <FormDescription>
                            This will appear at the top of your restaurant page.
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
