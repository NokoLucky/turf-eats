
'use client';

import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { Star, Utensils, PlusCircle, ArrowLeft, LayoutGrid, Check, X } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';
import type { Restaurant, MenuItem, MenuItemOptionGroup } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StoreStatusBadge } from '@/components/store-status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

function SelectionDialog({
  item,
  open,
  onOpenChange,
  onConfirm
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selections: Record<string, string[]>) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open && item?.options) {
      const initial: Record<string, string[]> = {};
      item.options.forEach(opt => {
        initial[opt.name] = opt.type === 'radio' ? [opt.choices[0]] : [];
      });
      setSelections(initial);
    }
  }, [open, item]);

  if (!item) return null;

  const handleRadioChange = (groupName: string, choice: string) => {
    setSelections(prev => ({ ...prev, [groupName]: [choice] }));
  };

  const handleCheckboxChange = (groupName: string, choice: string, checked: boolean, min?: number, max?: number) => {
    setSelections(prev => {
      const current = prev[groupName] || [];
      if (checked) {
        if (max && current.length >= max) return prev;
        return { ...prev, [groupName]: [...current, choice] };
      } else {
        return { ...prev, [groupName]: current.filter(c => c !== choice) };
      }
    });
  };

  const isValid = () => {
    if (!item.options) return true;
    return item.options.every(opt => {
      const selected = selections[opt.name] || [];
      if (opt.isRequired && selected.length === 0) return false;
      if (opt.minSelections && selected.length < opt.minSelections) return false;
      return true;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <div className="relative h-40 w-full">
           <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
           <div className="absolute bottom-4 left-6">
              <h3 className="text-2xl font-bold text-white">{item.name}</h3>
              <p className="text-white/70 text-sm">Customize your meal</p>
           </div>
        </div>
        <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto">
          {item.options?.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{group.name}</h4>
                  {group.maxSelections && (
                    <p className="text-xs text-muted-foreground">Select up to {group.maxSelections}</p>
                  )}
                </div>
                {group.isRequired && <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-none">REQUIRED</Badge>}
              </div>

              {group.type === 'radio' ? (
                <RadioGroup 
                  value={selections[group.name]?.[0]} 
                  onValueChange={(val) => handleRadioChange(group.name, val)}
                  className="space-y-3"
                >
                  {group.choices.map((choice) => (
                    <div key={choice} className="flex items-center space-x-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer">
                      <RadioGroupItem value={choice} id={`${group.id}-${choice}`} />
                      <Label htmlFor={`${group.id}-${choice}`} className="flex-1 cursor-pointer font-medium">{choice}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                   {group.choices.map((choice) => {
                     const isChecked = selections[group.name]?.includes(choice);
                     return (
                      <div 
                        key={choice} 
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer",
                          isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => handleCheckboxChange(group.name, choice, !isChecked, group.minSelections, group.maxSelections)}
                      >
                        <Checkbox checked={isChecked} id={`${group.id}-${choice}`} />
                        <Label htmlFor={`${group.id}-${choice}`} className="flex-1 cursor-pointer font-medium">{choice}</Label>
                      </div>
                     )
                   })}
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="p-6 bg-muted/30">
          <Button onClick={() => onConfirm(selections)} disabled={!isValid()} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20">
             Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RestaurantMenuPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { dispatch } = useCart();
  const firestore = useFirestore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('All');
  
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isSelectionOpen, setSelectionOpen] = useState(false);
  
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (!firestore || !id) return;

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
        setRestaurant(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, id]);

  const menuByCategory = useMemo(() => {
    if (!menuItems) return {};
    const grouped = menuItems.reduce((acc, item) => {
      const category = item.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    // Sort categories according to requested order:
    // 1. General
    // 2. Meals
    // 3. (Others)
    // 4. Drinks (any category containing 'drinks')
    // 5. Extras / Sides
    return Object.keys(grouped).sort((a, b) => {
        const getWeight = (cat: string) => {
            const lowerCat = cat.toLowerCase();
            if (cat === 'General') return 0;
            if (cat === 'Meals') return 1;
            if (lowerCat.includes('drink')) return 80;
            if (cat === 'Sides') return 85;
            if (cat === 'Extras') return 90;
            return 50; // Everything else in between
        };

        const weightA = getWeight(a);
        const weightB = getWeight(b);
        
        if (weightA !== weightB) return weightA - weightB;
        return a.localeCompare(b);
    }).reduce((obj, key) => {
        obj[key] = grouped[key];
        return obj;
    }, {} as Record<string, MenuItem[]>);

  }, [menuItems]);

  const categories = useMemo(() => {
    const list = Object.keys(menuByCategory);
    return ['All', ...list];
  }, [menuByCategory]);

  const filteredMenu = useMemo(() => {
    if (selectedMenuCategory === 'All') return Object.entries(menuByCategory);
    return Object.entries(menuByCategory).filter(([name]) => name === selectedMenuCategory);
  }, [menuByCategory, selectedMenuCategory]);

  const handleAddToCart = (item: MenuItem, selectedOptions?: Record<string, string[]>) => {
    const priceToUse = item.promotionalPrice && item.promotionalPrice > 0 ? item.promotionalPrice : item.price;
    
    // Generate a unique ID for customized variations
    const cartId = selectedOptions 
      ? `${item.id}-${Object.values(selectedOptions).flat().join('-')}` 
      : item.id;

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        ...item,
        id: cartId, // Use variations ID
        actualId: item.id, // Keep the real Firestore ID
        price: priceToUse,
        selectedOptions,
        image: {
          id: item.id,
          imageUrl: item.imageUrl,
          description: item.name,
          imageHint: 'food item',
        },
      },
    });

    toast({
      title: 'Added to cart!',
      description: `${item.name} has been added to your cart.`,
    });
    
    setSelectionOpen(false);
  };

  const onAddClick = (item: MenuItem) => {
    if (item.options && item.options.length > 0) {
      setCustomizingItem(item);
      setSelectionOpen(true);
    } else {
      handleAddToCart(item);
    }
  };

  const handleImagePreview = (url: string, title: string) => {
    setPreviewImage({ url, title });
  };

  if (!isLoading && !restaurant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <SelectionDialog 
        item={customizingItem}
        open={isSelectionOpen}
        onOpenChange={setSelectionOpen}
        onConfirm={(selections) => handleAddToCart(customizingItem!, selections)}
      />

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                {previewImage && (
                    <>
                        <img 
                            src={previewImage.url} 
                            alt={previewImage.title} 
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="mt-4 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full text-white font-bold text-lg">
                            {previewImage.title}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 text-white bg-black/20 hover:bg-black/40 rounded-full"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </>
                )}
            </div>
        </DialogContent>
      </Dialog>

      {isLoading || !restaurant ? (
        <>
          <Skeleton className="h-64 w-full" />
          <div className="container py-8 px-4 sm:px-8">
            <Skeleton className="h-12 w-1/3 mb-4" />
            <Skeleton className="h-6 w-1/4 mb-8" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0"><Skeleton className="aspect-video w-full" /></CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-10 w-full" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-7 w-1/3" />
                      <Skeleton className="h-10 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative h-64 sm:h-80 w-full">
            <Image
              src={restaurant.bannerUrl || 'https://picsum.photos/seed/banner/1200/400'}
              alt={`Promotional image for ${restaurant.name}`}
              data-ai-hint="restaurant food"
              fill
              className="object-cover cursor-zoom-in"
              onClick={() => handleImagePreview(restaurant.bannerUrl, restaurant.name)}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
            
            <div className="absolute top-6 left-4 sm:left-8 z-10">
                <Button asChild variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white rounded-full hover:bg-white/20 hover:text-white">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
            </div>

            <div className="container relative flex h-full items-end pb-10 px-4 sm:px-8 pointer-events-none">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-6 pointer-events-auto">
                <div>
                  <h1 className="font-headline text-4xl sm:text-6xl font-bold text-white drop-shadow-xl">
                    {restaurant.name}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-200">
                    <div className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-primary/20">
                      <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                      <span className="font-bold text-white">{(restaurant.rating || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-90">
                      <Utensils className="h-4 w-4 text-primary" />
                      <span className="font-medium">{restaurant.category}</span>
                    </div>
                     {restaurant.openingHours && <StoreStatusBadge openingHours={restaurant.openingHours} className="rounded-full px-4" />}
                  </div>
                </div>
                <div className="hidden sm:block h-24 w-24 relative rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-white cursor-zoom-in pointer-events-auto" onClick={() => handleImagePreview(restaurant.logoUrl, restaurant.name)}>
                   <Image src={restaurant.logoUrl || 'https://picsum.photos/seed/logo/200/200'} alt="logo" fill className="object-cover" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="container py-8 px-4 sm:px-8">
            <div className="mb-6 flex flex-col gap-6">
                <div>
                  <h2 className="font-headline text-3xl font-bold mb-1">Our Menu</h2>
                  <div className="h-1 w-12 bg-primary rounded-full"></div>
                </div>

                <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedMenuCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedMenuCategory(cat)}
                        className={cn(
                          "rounded-full whitespace-nowrap px-6 h-10 font-bold transition-all",
                          selectedMenuCategory === cat 
                            ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                            : "bg-white text-muted-foreground hover:bg-primary/5 hover:text-primary border-muted"
                        )}
                      >
                        {cat === 'All' && <LayoutGrid className="mr-2 h-3.5 w-3.5" />}
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
            </div>
            
            {filteredMenu.length > 0 ? (
                <div className="space-y-12">
                    {filteredMenu.map(([categoryName, items]) => (
                        <section key={categoryName}>
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-xl font-bold text-foreground">{categoryName}</h3>
                                <div className="h-px flex-1 bg-muted"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {items.map((item) => {
                                    const hasPromo = item.promotionalPrice && item.promotionalPrice > 0 && item.promotionalPrice < item.price;
                                    const displayPrice = hasPromo ? item.promotionalPrice : item.price;

                                    return (
                                        <Card key={item.id} className={cn("border-none shadow-premium rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1", item.isSoldOut && "opacity-70 bg-muted/30")}>
                                            <CardHeader className="p-0 relative">
                                                <div 
                                                  className="relative aspect-video w-full overflow-hidden cursor-zoom-in"
                                                  onClick={() => handleImagePreview(item.imageUrl, item.name)}
                                                >
                                                    <Image
                                                        src={item.imageUrl || 'https://picsum.photos/seed/menu/400/300'}
                                                        alt={item.name}
                                                        fill
                                                        className={cn("object-cover transition-transform duration-500 group-hover:scale-110", item.isSoldOut && "grayscale")}
                                                    />
                                                    {hasPromo && !item.isSoldOut && (
                                                        <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">PROMO</div>
                                                    )}
                                                    {item.isSoldOut && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                            <div className="bg-white text-black px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl border-2 border-black/10">SOLD OUT</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex flex-1 flex-col p-5">
                                                <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors">{item.name}</CardTitle>
                                                <CardDescription className="mt-1 flex-1 text-xs leading-relaxed line-clamp-2">{item.description}</CardDescription>
                                                <div className="mt-5 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <p className="text-lg font-bold text-primary">R{displayPrice.toFixed(2)}</p>
                                                        {hasPromo && (
                                                            <p className="text-[10px] text-muted-foreground line-through opacity-70">R{item.price.toFixed(2)}</p>
                                                        )}
                                                    </div>
                                                    <Button 
                                                        onClick={() => onAddClick(item)} 
                                                        disabled={item.isSoldOut}
                                                        className={cn(
                                                            "rounded-xl h-10 px-4 font-bold shadow-md transition-all",
                                                            !item.isSoldOut && "shadow-primary/10 hover:shadow-primary/30"
                                                        )}
                                                    >
                                                        {item.isSoldOut ? 'Unavailable' : (
                                                            <>
                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                                Add
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] shadow-premium">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Utensils className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <h2 className="text-xl font-bold">No items found</h2>
                    <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">We couldn't find any items in this category. Try selecting another one!</p>
                    <Button variant="link" onClick={() => setSelectedMenuCategory('All')} className="mt-2 text-primary font-bold">Show All Items</Button>
                </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
