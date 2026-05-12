'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, Search, Utensils, ShoppingBasket, Wine, 
  Pill, Droplets, Shirt, Package, MoreHorizontal, Bell, MapPin, 
  Clock, Truck
} from 'lucide-react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'Restaurants', icon: <Utensils /> },
  { name: 'Groceries', icon: <ShoppingBasket /> },
  { name: 'Liquor', icon: <Wine /> },
  { name: 'Pharmacy', icon: <Pill /> },
  { name: 'Water', icon: <Droplets /> },
  { name: 'Laundry', icon: <Shirt /> },
  { name: 'Parcels', icon: <Package /> },
  { name: 'More', icon: <MoreHorizontal /> },
];

function StoreCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full border-none shadow-premium bg-white">
      <Skeleton className="h-40 w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch customer profile to get the most up-to-date name
  const customerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/customers/${user.uid}`);
  }, [user?.uid, firestore]);
  const { data: customerProfile } = useDoc(customerRef);

  const [greeting, setGreeting] = React.useState('Good morning');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const storesRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'restaurants'), where('status', '==', 'active')) : null),
    [firestore]
  );
  const { data: stores, isLoading } = useCollection<Omit<Restaurant, 'menu'>>(storesRef);

  const rawName = customerProfile?.name || user?.displayName || '';
  const firstName = (rawName && !rawName.startsWith('New ')) ? rawName.split(' ')[0] : '';

  const filteredStores = React.useMemo(() => {
    if (!stores) return [];
    return stores.filter(store => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        store.name.toLowerCase().includes(lowercasedTerm) ||
        store.category.toLowerCase().includes(lowercasedTerm);
      
      const matchesCategory = !selectedCategory || 
        selectedCategory === 'More' || 
        store.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [stores, searchTerm, selectedCategory]);

  const handleCategoryClick = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header Section */}
      <div className="bg-white px-4 pt-6 pb-4 sm:px-8 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Delivering to</p>
              <h2 className="text-sm font-bold flex items-center gap-1">
                Turfloop, Polokwane <ChevronDown className="h-3 w-3" />
              </h2>
            </div>
          </div>
          <button className="bg-secondary p-2 rounded-full relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="text-2xl font-bold mt-1 leading-tight">
            Anything you need, <span className="text-primary">delivered fast</span> in Turfloop & Polokwane.
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for stores, items or anything..."
            className="pl-10 h-12 bg-secondary border-none rounded-2xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="container px-4 sm:px-8 pt-6">
        {/* Category Grid */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <div 
                key={cat.name} 
                className="flex flex-col items-center gap-2 group cursor-pointer"
                onClick={() => handleCategoryClick(cat.name)}
              >
                <div className={cn(
                  "shadow-premium p-4 rounded-2xl transition-all duration-300 group-hover:scale-110",
                  isActive ? "bg-primary text-white scale-110" : "bg-white text-primary"
                )}>
                  {React.cloneElement(cat.icon as React.ReactElement, { 
                    className: cn("h-6 w-6", isActive ? "text-white" : "text-primary") 
                  })}
                </div>
                <span className={cn(
                  "text-[10px] font-bold text-center",
                  isActive ? "text-primary" : "text-foreground"
                )}>
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Popular Near You */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {selectedCategory ? `${selectedCategory} near you` : 'Popular Near You'}
            </h2>
            <Link href="#" className="text-primary text-xs font-bold">See all</Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="min-w-[280px]">
                  <StoreCardSkeleton />
                </div>
              ))
            ) : filteredStores.length > 0 ? (
              filteredStores.map((store) => (
                <Link href={`/restaurant/${store.id}`} key={store.id} className="min-w-[280px]">
                  <Card className="overflow-hidden border-none shadow-premium bg-white group h-full">
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={store.bannerUrl || 'https://picsum.photos/seed/placeholder/600/400'}
                        alt={store.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <Star className="h-3 w-3 text-primary fill-primary" />
                          {(store.rating || 4.5).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 overflow-hidden">
                          <h3 className="font-bold truncate">{store.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{store.deliveryTime || '20-30 min'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3 text-primary" />
                              <span>R{store.deliveryFee || '20'} delivery</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-10 w-10 relative flex-shrink-0 bg-secondary rounded-lg overflow-hidden border">
                          <Image src={store.logoUrl || 'https://picsum.photos/seed/logo/100/100'} alt="logo" fill className="object-cover" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="w-full text-center py-10 bg-white rounded-3xl">
                <p className="text-muted-foreground">No stores found in this category.</p>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="mt-2 text-primary text-xs font-bold"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* All Stores (Vertical) */}
        <div className="mb-8">
           <h2 className="text-lg font-bold mb-4">All Stores</h2>
           <div className="space-y-4">
              {filteredStores.length > 0 ? (
                filteredStores.map(store => (
                  <Link href={`/restaurant/${store.id}`} key={store.id} className="flex gap-4 bg-white p-3 rounded-2xl shadow-premium group">
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={store.logoUrl || 'https://picsum.photos/seed/logo/200/200'} alt={store.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-bold">{store.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="h-3 w-3 text-primary fill-primary" />
                        <span className="text-xs font-bold">{(store.rating || 4.5).toFixed(1)}</span>
                        <span className="text-muted-foreground text-[10px]">(150+)</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-medium">
                         <span className="text-primary">Open now</span>
                         <span className="text-muted-foreground">• Min. order R{store.minOrder || '50'}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10">
                   <p className="text-muted-foreground">No results match your search and filters.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  )
}
