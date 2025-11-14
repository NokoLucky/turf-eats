'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, Utensils, PlusCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';
import type { Restaurant, MenuItem } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantMenuPage({ params: { id } }: { params: { id: string } }) {
  const { toast } = useToast();
  const { dispatch } = useCart();
  const firestore = useFirestore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const restaurantDocRef = doc(firestore, 'restaurants', id);
        const restaurantDoc = await getDoc(restaurantDocRef);

        if (restaurantDoc.exists()) {
          setRestaurant({ id: restaurantDoc.id, ...restaurantDoc.data() } as Restaurant);
        } else {
          setRestaurant(null);
        }

        const menuItemsCollectionRef = collection(firestore, 'restaurants', id, 'menuItems');
        const menuItemsSnapshot = await getDocs(menuItemsCollectionRef);
        setMenuItems(menuItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));

      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        setRestaurant(null); // Ensure not found on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, id]);

  const handleAddToCart = (item: MenuItem) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, image: { id: item.id, imageUrl: item.imageUrl, description: item.name, imageHint: 'food' } } });
    toast({
      title: 'Added to cart!',
      description: `${item.name} has been added to your cart.`,
    });
  };

  if (!isLoading && !restaurant) {
    notFound();
  }

  return (
    <div>
      {isLoading || !restaurant ? (
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
      ) : (
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
