'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, Search, Bell, MapPin, 
  Clock, Truck, ChevronDown, X,
  MoreHorizontal
} from 'lucide-react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const categories = [
  { name: 'Restaurants', emoji: '🍔', bg: 'bg-orange-100', color: 'text-orange-600' },
  { name: 'Groceries', emoji: '🍎', bg: 'bg-green-100', color: 'text-green-600' },
  { name: 'Liquor', emoji: '🍷', bg: 'bg-purple-100', color: 'text-purple-600' },
  { name: 'Pharmacy', emoji: '💊', bg: 'bg-blue-100', color: 'text-blue-600' },
  { name: 'Water', emoji: '💧', bg: 'bg-cyan-100', color: 'text-cyan-600' },
  { name: 'Laundry', emoji: '🧺', bg: 'bg-pink-100', color: 'text-pink-600' },
  { name: 'Parcels', emoji: '📦', bg: 'bg-amber-100', color: 'text-amber-600' },
  { name: 'More', emoji: '•••', bg: 'bg-slate-100', color: 'text-slate-600' },
];

function StoreCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full border-none shadow-premium bg-white rounded-2xl">
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
  const firstName = (rawName && !rawName.startsWith('New ')) ? rawName.split(' ')[0] : 'Voxinet';

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

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10">
      <div className="bg-white px-4 pt-8 pb-6 sm:px-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <div className="bg-primary/10 p-2 rounded-full">
               <Image src="https://picsum.photos/seed/logo/100/100" alt="Pin2You" width={24} height={24} className="rounded-full" />
             </div>
             <span className="text-primary font-bold text-xl font-headline">Pin2You</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-orange-100 p-2 rounded-xl text-primary relative">
              <Image src="https://picsum.photos/seed/cart/40/40" alt="Cart" width={20} height={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">1</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-sm font-medium text-muted-foreground">{greeting}, {firstName} 👋</h1>
          <p className="text-2xl font-bold mt-1 leading-tight">
            Anything you need, <span className="text-primary">delivered fast</span> in Turfloop & Polokwane.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for stores, items or anything..."
            className="pl-12 h-14 bg-[#F1F3F5] border-none rounded-2xl text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-4 gap-y-6 mb-4">
          {categories.map((cat) => (
            <div 
              key={cat.name} 
              className="flex flex-col items-center gap-2 group cursor-pointer"
              onClick={() => setSelectedCategory(cat.name === 'More' ? null : cat.name)}
            >
              <div className={cn(
                "h-16 w-16 flex items-center justify-center rounded-full transition-all duration-300 shadow-sm text-2xl",
                cat.bg,
                selectedCategory === cat.name ? "ring-2 ring-primary ring-offset-2 scale-105" : ""
              )}>
                {cat.emoji}
              </div>
              <span className="text-[11px] font-bold text-center text-muted-foreground">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="container px-4 sm:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Popular Near You</h2>
          <Link href="#" className="text-muted-foreground text-sm font-medium">See all</Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[180px]">
                <StoreCardSkeleton />
              </div>
            ))
          ) : filteredStores.length > 0 ? (
            filteredStores.map((store) => (
              <Link href={`/restaurant/${store.id}`} key={store.id} className="min-w-[200px]">
                <Card className="overflow-hidden border-none shadow-premium bg-white group h-full rounded-2xl">
                  <div className="relative h-28 w-full overflow-hidden">
                    <Image
                      src={store.bannerUrl || 'https://picsum.photos/seed/placeholder/600/400'}
                      alt={store.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2">
                       <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] text-white font-bold flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                        {(store.rating || 4.5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm truncate">{store.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-medium">
                      <span>$$</span>
                      <span>•</span>
                      <span>{store.deliveryTime || '20-30 min'}</span>
                      <span>•</span>
                      <span>1.5 km</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="w-full text-center py-10 bg-white rounded-3xl">
              <p className="text-muted-foreground">No stores found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
