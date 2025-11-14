'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, Utensils, PlusCircle } from 'lucide-react';
import React, { useEffect } from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Restaurant, MenuItem } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantMenuPage({ params: { id } }: { params: { id: string } }) {
  console.log('[Page Load] Restaurant ID from URL params:', id);
  const { toast } = useToast();
  const { dispatch } = useCart();
  const firestore = useFirestore();

  console.log('[State Check] Firestore instance available:', !!firestore);

  const restaurantRef = useMemoFirebase(
    () => {
      if (!firestore) {
        console.log('[Memo Check] Firestore not ready for restaurantRef');
        return null;
      }
      console.log('[Memo Check] Creating restaurantRef with path:', `restaurants/${id}`);
      return doc(firestore, 'restaurants', id);
    },
    [firestore, id]
  );
  const menuItemsRef = useMemoFirebase(
    () => {
      if (!firestore) {
        console.log('[Memo Check] Firestore not ready for menuItemsRef');
        return null;
      }
      console.log('[Memo Check] Creating menuItemsRef with path:', `restaurants/${id}/menuItems`);
      return collection(firestore, 'restaurants', id, 'menuItems');
    },
    [firestore, id]
  );

  const { data: restaurant, isLoading: isRestaurantLoading, error: restaurantError } = useDoc<Omit<Restaurant, 'menu'>>(restaurantRef);
  const { data: menuItems, isLoading: isMenuLoading } = useCollection<MenuItem>(menuItemsRef);

  console.log('[useDoc Result - Restaurant]', { data: restaurant, isLoading: isRestaurantLoading, error: restaurantError });
  console.log('[useCollection Result - Menu]', { data: menuItems, isLoading: isMenuLoading });

  useEffect(() => {
    if (restaurantError) {
      console.error("Firestore error fetching restaurant:", restaurantError);
    }
  }, [restaurantError]);

  const isLoading = !firestore || isRestaurantLoading || isMenuLoading;
  console.log('[Loading State] Final isLoading value:', isLoading);


  if (!isLoading && !restaurant) {
    console.error('Restaurant not found after loading. Triggering 404.');
    notFound();
  }

  const handleAddToCart = (item: MenuItem) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, image: { id: item.id, imageUrl: item.imageUrl, description: item.name, imageHint: 'food' } } });
    toast({
      title: 'Added to cart!',
      description: `${item.name} has been added to your cart.`,
    });
  };

  return (
    <div>
      {isLoading ? (
        <>
          <Skeleton className="h-64 w-full" />
          <div className="container py-8 px-4 sm:px-8">
            <Skeleton className="h-12 w-1/3 mb-4" />
            <Skeleton className="h-6 w-1/4 mb-8" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="aspect-video w-full" /></CardHeader><CardContent className="mt-6 space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-1/2 ml-auto" /></CardContent></Card>
              ))}
            </div>
          </div>
        </>
      ) : restaurant && (
        <>
          <div className="relative h-64 w-full">
            <Image
              src={restaurant.bannerUrl || 'https://picsum.photos/seed/banner/1200/400'}
              alt={`Promotional image for ${restaurant.name}`}
              data-ai-hint="restaurant food"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="container relative flex h-full items-end pb-8 px-4 sm:px-8">
              <div>
                <h1 className="font-headline text-4xl sm:text-5xl font-bold text-white">
                  {restaurant.name}
                </h1>
                <div className="mt-2 flex items-center gap-4 text-sm text-neutral-200">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-primary fill-primary" />
                    <span>{(restaurant.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Utensils className="h-4 w-4" />
                    <span>{restaurant.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="container py-12 px-4 sm:px-8">
            <h2 className="font-headline text-3xl font-bold mb-8">Menu</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {menuItems?.map((item) => (
                <Card key={item.id} className="flex flex-col">
                  <CardHeader>
                    <div className="relative aspect-video w-full overflow-hidden rounded-md">
                      <Image
                        src={item.imageUrl || 'https://picsum.photos/seed/menu/400/300'}
                        alt={item.name}
                        data-ai-hint="food item"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col p-4">
                    <CardTitle className="font-headline text-xl">{item.name}</CardTitle>
                    <CardDescription className="mt-2 flex-1">{item.description}</CardDescription>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-lg font-bold text-primary">R{item.price.toFixed(2)}</p>
                      <Button onClick={() => handleAddToCart(item)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
