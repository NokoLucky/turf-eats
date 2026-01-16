'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Utensils, Search, ChefHat, ShoppingBasket, Wine, Pill } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'All', icon: <ChefHat /> },
  { name: 'Restaurants', icon: <Utensils /> },
  { name: 'Groceries', icon: <ShoppingBasket /> },
  { name: 'Liquor', icon: <Wine /> },
  { name: 'Pharmacy', icon: <Pill /> },
];

function StoreCardSkeleton() {
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
  const storesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'restaurants') : null),
    [firestore]
  );
  const { data: stores, isLoading } = useCollection<Omit<Restaurant, 'menu'>>(storesRef);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const filteredStores = React.useMemo(() => {
    if (!stores) return [];
    
    return stores
      .filter(store => {
        if (selectedCategory === 'All') return true;
        // This handles cases where a store might have multiple categories, e.g. "Pizza, Italian"
        return store.category.split(',').map(c => c.trim()).includes(selectedCategory);
      })
      .filter(store => {
        if (!searchTerm) return true;
        const lowercasedTerm = searchTerm.toLowerCase();
        return (
          store.name.toLowerCase().includes(lowercasedTerm) ||
          store.category.toLowerCase().includes(lowercasedTerm)
        );
      });
  }, [stores, searchTerm, selectedCategory]);

  return (
    <div className="bg-muted/20">
      <div className="container py-8 px-4 sm:px-8">
        <div className="mb-12 text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">
            What are you looking for?
          </h1>
          <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
            Order from the best local stores, restaurants, and pharmacies.
          </p>
          <div className="mt-6 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for stores, items, or cuisines..."
                className="pl-10 bg-card h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button size="lg" className="h-12 font-bold" type="button">Search</Button>
          </div>
        </div>

        <div className="mb-12">
            <h2 className="font-headline text-2xl font-bold mb-4">Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {categories.map((category) => (
                    <Card 
                        key={category.name}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 sm:p-6 hover:bg-primary/10 hover:shadow-md transition-all cursor-pointer",
                            selectedCategory === category.name && "ring-2 ring-primary bg-primary/10 shadow-lg"
                        )}
                        onClick={() => setSelectedCategory(category.name)}
                    >
                        <div className="p-3 rounded-full bg-primary/10 mb-2 text-primary">
                            {React.cloneElement(category.icon, { className: "h-6 w-6 sm:h-8 sm:w-8" })}
                        </div>
                        <p className="font-semibold text-sm sm:text-base text-center">{category.name}</p>
                    </Card>
                ))}
            </div>
        </div>

        <div>
            <h2 className="font-headline text-2xl font-bold mb-4">
                {selectedCategory === 'All' ? 'Popular Nearby' : `Popular in ${selectedCategory}`}
            </h2>
            
            {isLoading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <StoreCardSkeleton key={i} />)}
              </div>
            )}

            {!isLoading && filteredStores.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredStores.map((store) => (
                    <Link href={`/restaurant/${store.id}`} key={store.id} className="group">
                        <Card className="overflow-hidden h-full transition-shadow duration-300 hover:shadow-lg">
                        <CardHeader className="p-0">
                            <div className="relative h-48 w-full">
                            <Image
                                src={store.bannerUrl || 'https://picsum.photos/seed/placeholder/1200/400'}
                                alt={`A promotional image for ${store.name}`}
                                data-ai-hint="restaurant food"
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                            <Image
                                src={store.logoUrl || 'https://picsum.photos/seed/logo/100/100'}
                                alt={`Logo for ${store.name}`}
                                data-ai-hint="restaurant logo"
                                width={48}
                                height={48}
                                className="rounded-md border-2 border-background shadow-sm -mt-10 bg-card p-1 object-cover"
                            />
                            <div className="flex-1">
                                <h3 className="font-headline text-lg font-bold truncate">{store.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-primary fill-primary" />
                                    <span>{(store.rating || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Utensils className="h-4 w-4" />
                                    <span>{store.category}</span>
                                </div>
                                </div>
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                    </Link>
                    ))}
                </div>
            )}

            {!isLoading && filteredStores.length === 0 && (
                <div className="text-center py-20 bg-card rounded-lg">
                    <h3 className="text-2xl font-bold">No Stores Found</h3>
                    <p className="text-muted-foreground mt-2">Try adjusting your search or category selection.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
