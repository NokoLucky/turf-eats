'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, Utensils, PlusCircle } from 'lucide-react';

import { restaurants } from '@/lib/data';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function RestaurantMenuPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const { dispatch } = useCart();
  const restaurant = restaurants.find((r) => r.id === params.id);

  if (!restaurant) {
    notFound();
  }

  const handleAddToCart = (item: (typeof restaurant.menu)[0]) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    toast({
      title: 'Added to cart!',
      description: `${item.name} has been added to your cart.`,
    });
  };

  return (
    <div>
      <div className="relative h-64 w-full">
        <Image
          src={restaurant.banner.imageUrl}
          alt={`Promotional image for ${restaurant.name}`}
          data-ai-hint={restaurant.banner.imageHint}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="container relative flex h-full items-end pb-8">
          <div>
            <h1 className="font-headline text-5xl font-bold text-white">
              {restaurant.name}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-neutral-200">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span>{restaurant.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Utensils className="h-4 w-4" />
                <span>{restaurant.category}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container py-12">
        <h2 className="font-headline text-3xl font-bold mb-8">Menu</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restaurant.menu.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                   <Image
                    src={item.image.imageUrl}
                    alt={item.image.description}
                    data-ai-hint={item.image.imageHint}
                    fill
                    className="object-cover"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <CardTitle className="font-headline text-xl">{item.name}</CardTitle>
                <CardDescription className="mt-2 flex-1">{item.description}</CardDescription>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
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
    </div>
  );
}
