'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, Search, MapPin, 
  Clock, Truck, ChevronDown, X,
  MoreHorizontal, ZoomIn, Info
} from 'lucide-react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WhatsAppFAB from '@/components/whatsapp-fab';

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

function ImagePreviewDialog({
  url,
  title,
  open,
  onOpenChange
}: {
  url: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!url) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 overflow-hidden bg-black/90 border-none shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{title || 'Image Preview'}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full">
           <Image src={url} alt={title || "preview"} fill className="object-contain" />
        </div>
        {title && (
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <Badge className="bg-white/20 backdrop-blur-md text-white border-none px-4 py-1.5 rounded-full text-sm font-bold">
              {title}
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
  
  // Image preview state
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string | undefined>(undefined);
  const [isPreviewOpen, setPreviewOpen] = React.useState(false);

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

  // Logic for "Popular Near You": Pull first 3 stores for now
  const popularStores = React.useMemo(() => {
    return filteredStores.slice(0, 3);
  }, [filteredStores]);

  const openPreview = (url: string, title?: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 relative">
      <ImagePreviewDialog 
        url={previewUrl}
        title={previewTitle}
        open={isPreviewOpen}
        onOpenChange={setPreviewOpen}
      />

      <div className="bg-white px-4 pt-8 pb-6 sm:px-8">
        <div className="mb-6">
          <h1 className="text-sm font-medium text-muted-foreground">{greeting}, {firstName} 👋</h1>
          <p className="text-2xl font-bold mt-1 leading-tight">
            Anything you need, <span className="text-primary">delivered fast</span> near you.
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
          <Link href="#" className="text-primary text-xs font-bold uppercase tracking-widest">See all</Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[180px]">
                <StoreCardSkeleton />
              </div>
            ))
          ) : popularStores.length > 0 ? (
            popularStores.map((store) => (
              <div key={store.id} className="min-w-[240px] flex flex-col gap-2">
                <Card className="overflow-hidden border-none shadow-premium bg-white group h-full rounded-2xl">
                  <div className="relative h-32 w-full overflow-hidden cursor-pointer" onClick={() => openPreview(store.bannerUrl || 'https://picsum.photos/seed/placeholder/600/400', store.name)}>
                    <Image
                      src={store.bannerUrl || 'https://picsum.photos/seed/placeholder/600/400'}
                      alt={store.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="text-white h-6 w-6" />
                    </div>
                    <div className="absolute top-2 left-2">
                       <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] text-white font-bold flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                        {(store.rating || 4.5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/restaurant?id=${store.id}`}>
                    <CardContent className="p-3 hover:bg-muted/30 transition-colors">
                      <h3 className="font-bold text-sm truncate">{store.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-medium">
                        <span>$$</span>
                        <span>•</span>
                        <span>{store.deliveryTime || '20-30 min'}</span>
                        <span>•</span>
                        <span>{store.category}</span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </div>
            ))
          ) : (
            <div className="min-w-full text-center py-10 opacity-30">
               <Info className="mx-auto h-8 w-8 mb-2" />
               <p className="text-sm font-bold uppercase tracking-widest">Finding stores...</p>
            </div>
          )}
        </div>
      </div>

      <div className="container px-4 sm:px-8 pt-8">
        <h2 className="text-lg font-bold mb-6">Explore All Stores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <StoreCardSkeleton key={i} />)
            ) : filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                    <Card key={store.id} className="overflow-hidden border-none shadow-premium bg-white group rounded-[2rem] flex flex-col">
                        <div className="relative h-40 w-full cursor-pointer" onClick={() => openPreview(store.bannerUrl || '', store.name)}>
                             <Image
                                src={store.bannerUrl || 'https://picsum.photos/seed/placeholder/600/400'}
                                alt={store.name}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-white">
                                    <Image src={store.logoUrl} alt="logo" width={40} height={40} className="object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm leading-tight">{store.name}</h3>
                                    <p className="text-[10px] text-white/80 font-medium">{store.category}</p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4">
                                <span className="bg-white px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md">
                                    <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
                                    {(store.rating || 4.5).toFixed(1)}
                                </span>
                            </div>
                        </div>
                        <CardContent className="p-4 flex flex-col gap-3">
                             <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {store.deliveryTime || '25 min'}</div>
                                <div className="flex items-center gap-1"><Truck className="h-3 w-3" /> R{store.deliveryFee?.toFixed(2) || '30.00'}</div>
                             </div>
                             <Button asChild className="w-full rounded-xl bg-orange-50 text-primary hover:bg-orange-100 hover:text-primary shadow-none font-bold text-xs h-10">
                                <Link href={`/restaurant?id=${store.id}`}>Browse Products</Link>
                             </Button>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-3">
                    <Info className="h-12 w-12 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground font-medium">No stores match your search.</p>
                    <Button variant="outline" className="rounded-xl" onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}>Clear Filters</Button>
                </div>
            )}
        </div>
      </div>
      
      <WhatsAppFAB />
    </div>
  );
}
