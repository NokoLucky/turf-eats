'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Utensils, Search, ChefHat, Pizza, Salad } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const categories = [
  { name: 'All', icon: <ChefHat /> },
  { name: 'Diner', icon: <Utensils /> },
  { name: 'Pizza', icon: <Pizza /> },
  { name: 'Healthy', icon: <Salad /> },
];

function RestaurantCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="p-0">
        <Skeleton className="h-48 w-full" />
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-md -mt-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboardPage() {
  const firestore = useFirestore();
  const restaurantsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'restaurants') : null),
    [firestore]
  );
  const { data: restaurants, isLoading } = useCollection<Omit<Restaurant, 'menu'>>(restaurantsRef);

  return (
    <div className="bg-muted/20">
      <div className="container py-8">
        <div className="mb-12 text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">
            Find Your Next Meal
          </h1>
          <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
            Browse through the best local restaurants and find your favorite dishes.
          </p>
          <div className="mt-6 max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search restaurants or cuisines..." className="pl-10 bg-card h-12" />
            </div>
            <Button size="lg" className="h-12 font-bold">Search</Button>
          </div>
        </div>

        <div className="mb-12">
            <h2 className="font-headline text-2xl font-bold mb-4">Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {categories.map((category) => (
                    <Card key={category.name} className="flex flex-col items-center justify-center p-6 hover:bg-primary/5 hover:shadow-md transition-all cursor-pointer">
                        <div className="p-3 rounded-full bg-primary/10 mb-2 text-primary">
                            {React.cloneElement(category.icon, { className: "h-8 w-8" })}
                        </div>
                        <p className="font-semibold">{category.name}</p>
                    </Card>
                ))}
            </div>
        </div>

        <div>
            <h2 className="font-headline text-2xl font-bold mb-4">Popular Restaurants</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
            {restaurants?.map((restaurant) => (
            <Link href={`/restaurant/${restaurant.id}`} key={restaurant.id} className="group">
                <Card className="overflow-hidden h-full transition-shadow duration-300 hover:shadow-lg">
                <CardHeader className="p-0">
                    <div className="relative h-48 w-full">
                    <Image
                        src={restaurant.bannerUrl || 'https://picsum.photos/seed/placeholder/1200/400'}
                        alt={`A promotional image for ${restaurant.name}`}
                        data-ai-hint="restaurant food"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                    <Image
                        src={restaurant.logoUrl || 'https://picsum.photos/seed/logo/100/100'}
                        alt={`Logo for ${restaurant.name}`}
                        data-ai-hint="restaurant logo"
                        width={48}
                        height={48}
                        className="rounded-md border-2 border-background shadow-sm -mt-10 bg-card p-1 object-cover"
                    />
                    <div className="flex-1">
                        <h3 className="font-headline text-lg font-bold truncate">{restaurant.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-primary fill-primary" />
                            <span>{restaurant.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Utensils className="h-4 w-4" />
                            <span>{restaurant.category}</span>
                        </div>
                        </div>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </Link>
            ))}
            </div>
        </div>
      </div>
    </div>
  );
}
