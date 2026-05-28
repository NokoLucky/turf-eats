
'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { notFound, useSearchParams } from 'next/navigation';
import { Star, Plus, ArrowLeft, LayoutGrid, Check, X, Clock, MapPin, ShoppingCart, ZoomIn } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';
import type { Restaurant, MenuItem, MenuItemOptionGroup, MenuItemAddOn, MenuItemAddOnGroup } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const CATEGORY_ORDER = [
  'General',
  'Breakfast',
  'Meals',
  'Sandwiches & Rolls',
  'Burgers',
  'Meat',
  'Fish & chips',
  'Chicken and Chips',
  'Sides',
  'Deserts',
  'hot beverages',
  'cold beverages',
  'Other Drinks',
  'Extras'
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

function SelectionDialog({
  item,
  open,
  onOpenChange,
  onConfirm
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selections: Record<string, string[]>, addOns: MenuItemAddOn[], quantity: number, totalUnitPrice: number) => void;
}) {
  // Use IDs for tracking to prevent collisions between questions with same text
  const [internalSelections, setInternalSelections] = useState<Record<string, string[]>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<MenuItemAddOn[]>([]);
  const [quantity, setQuantity] = useState(1);

  const totalUnitPrice = useMemo(() => {
    if (!item) return 0;
    let extraCost = 0;

    // Calculate cost from Choice Groups (Options)
    if (item.options) {
      item.options.forEach(group => {
        const selectedForGroup = internalSelections[group.id] || [];
        selectedForGroup.forEach(choiceName => {
          const choice = group.choices.find(c => c.name === choiceName);
          if (choice) extraCost += (choice.price || 0);
        });
      });
    }

    // Calculate cost from Add-ons
    const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    extraCost += addOnTotal;

    return item.price + extraCost;
  }, [item, internalSelections, selectedAddOns]);

  const totalPrice = totalUnitPrice * quantity;

  useEffect(() => {
    if (open && item) {
      const initial: Record<string, string[]> = {};
      if (item.options) {
        item.options.forEach(opt => {
          const choices = opt.choices.map(c => typeof c === 'string' ? { name: c, price: 0 } : c);
          initial[opt.id] = opt.type === 'radio' ? (opt.isRequired ? [choices[0].name] : []) : [];
        });
      }
      setInternalSelections(initial);
      setSelectedAddOns([]);
      setQuantity(1);
    }
  }, [open, item]);

  if (!item) return null;

  const handleChoiceToggle = (groupId: string, choiceName: string, type: 'radio' | 'checkbox', isChecked: boolean, max?: number) => {
    setInternalSelections(prev => {
      const current = prev[groupId] || [];
      if (type === 'radio') {
        return { ...prev, [groupId]: [choiceName] };
      }
      
      if (isChecked) {
        if (max && current.length >= max) return prev;
        return { ...prev, [groupId]: [...current, choiceName] };
      } else {
        return { ...prev, [groupId]: current.filter(c => c !== choiceName) };
      }
    });
  };

  const handleAddOnToggle = (addon: MenuItemAddOn, checked: boolean) => {
    setSelectedAddOns(prev => 
      checked ? [...prev, addon] : prev.filter(a => a.id !== addon.id)
    );
  };

  const isValid = () => {
    if (!item.options) return true;
    return item.options.every(opt => {
      const selected = internalSelections[opt.id] || [];
      if (opt.isRequired && selected.length === 0) return false;
      if (opt.minSelections && selected.length < opt.minSelections) return false;
      return true;
    });
  };

  const handleConfirmOrder = () => {
    // Map internal IDs back to Display Names for the Cart/Order Record
    const displaySelections: Record<string, string[]> = {};
    item.options?.forEach(opt => {
      const selected = internalSelections[opt.id];
      if (selected && selected.length > 0) {
        displaySelections[opt.name] = selected;
      }
    });

    onConfirm(displaySelections, selectedAddOns, quantity, totalUnitPrice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] border-none shadow-2xl h-[90vh] flex flex-col pt-[env(safe-area-inset-top)] bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="relative h-[250px] w-full shrink-0">
           <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
           <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"
            onClick={() => onOpenChange(false)}
           >
             <X className="h-5 w-5" />
           </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-black text-foreground">{item.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
            </div>
            {item.isBestseller && (
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950/40 text-primary border-none text-[10px] font-bold px-3 py-1">Popular</Badge>
            )}
          </div>
          
          <div className="text-xl font-black text-primary">R{item.price.toFixed(2)}</div>

          {/* QUESTION BLOCKS (OPTIONS) */}
          {item.options?.map((group) => {
            const normalizedChoices = group.choices.map(c => typeof c === 'string' ? { name: c, price: 0 } : c);

            return (
              <div key={group.id} className="space-y-4">
                <div className="flex items-center justify-between bg-muted/50 -mx-6 px-6 py-3 border-y">
                  <h4 className="font-black text-sm text-foreground">
                    {group.name} 
                    {group.type === 'checkbox' && group.maxSelections && (
                      <span className="text-muted-foreground font-medium ml-1 text-xs">(Select up to {group.maxSelections})</span>
                    )}
                  </h4>
                  {group.isRequired && (
                    <Badge variant="secondary" className="text-[9px] bg-primary text-white border-none font-black tracking-widest">REQUIRED</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {normalizedChoices.map((choice) => {
                    const isChecked = internalSelections[group.id]?.includes(choice.name);
                    return (
                      <div 
                        key={choice.name} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                          isChecked ? "border-primary bg-primary/5" : "border-muted hover:border-slate-200 dark:hover:border-slate-800"
                        )}
                        onClick={() => handleChoiceToggle(group.id, choice.name, group.type, !isChecked, group.maxSelections)}
                      >
                        <div className="flex items-center gap-3">
                            {group.type === 'radio' ? (
                                <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isChecked ? "border-primary bg-primary" : "border-muted-foreground/30"
                                )}>
                                {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                            ) : (
                                <div className={cn(
                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                isChecked ? "border-primary bg-primary" : "border-muted-foreground/30"
                                )}>
                                {isChecked && <Check className="h-3 w-3 text-white" />}
                                </div>
                            )}
                            <Label className="font-bold text-sm cursor-pointer text-foreground/80">{choice.name}</Label>
                        </div>
                        {choice.price > 0 && (
                          <span className="text-xs font-black text-primary">+ R{choice.price.toFixed(2)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* EXTRA GROUPS (ADD-ONS) */}
          {item.addOnGroups?.map((group) => (
            <div key={group.id} className="space-y-4">
               <div className="bg-muted/50 -mx-6 px-6 py-3 border-y">
                  <h4 className="font-black text-sm text-foreground">{group.title}</h4>
               </div>
               <div className="space-y-3">
                  {group.items.map((addon) => {
                    const isChecked = selectedAddOns.some(a => a.id === addon.id);
                    return (
                      <div 
                        key={addon.id} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                          isChecked ? "border-primary bg-primary/5" : "border-muted hover:border-slate-200 dark:hover:border-slate-800"
                        )}
                        onClick={() => handleAddOnToggle(addon, !isChecked)}
                      >
                         <div className="flex items-center gap-3">
                            <Checkbox 
                              id={`addon-${addon.id}`} 
                              checked={isChecked}
                              onCheckedChange={(checked) => handleAddOnToggle(addon, !!checked)}
                              className="h-5 w-5 rounded-md"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Label htmlFor={`addon-${addon.id}`} className="text-sm font-bold cursor-pointer text-foreground/80">{addon.name}</Label>
                         </div>
                         {addon.price > 0 && (
                            <span className="text-xs font-black text-primary">+ R{addon.price.toFixed(2)}</span>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>
          ))}
        </div>

        <DialogFooter className="p-6 bg-card border-t shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center bg-muted rounded-full px-3 py-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full hover:bg-white/50" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <span className="w-10 text-center font-black text-lg">{quantity}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full hover:bg-white/50" 
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
            <Button 
              onClick={handleConfirmOrder} 
              disabled={!isValid()} 
              className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 flex justify-between px-8"
            >
               <span>Add to Cart</span>
               <span>R{totalPrice.toFixed(2)}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestaurantContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { toast } = useToast();
  const { dispatch } = useCart();
  const firestore = useFirestore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('All');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isSelectionOpen, setSelectionOpen] = useState(false);
  
  // Image preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined);
  const [isPreviewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!firestore || !id) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const restaurantDocRef = doc(firestore, 'restaurants', id);
        const restaurantDoc = await getDoc(restaurantDocRef);
        if (restaurantDoc.exists()) {
          setRestaurant({ id: restaurantDoc.id, ...restaurantDoc.data() } as Restaurant);
        }
        const menuItemsCollectionRef = collection(firestore, 'restaurants', id, 'menuItems');
        const menuItemsSnapshot = await getDocs(menuItemsCollectionRef);
        setMenuItems(menuItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [firestore, id]);

  const menuByCategory = useMemo(() => {
    if (!menuItems) return {};
    return menuItems.reduce((acc, item) => {
      const category = item.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  const sortedCategoryNames = useMemo(() => {
    const keys = Object.keys(menuByCategory);
    return keys.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      
      const weightA = indexA === -1 ? 99 : indexA;
      const weightB = indexB === -1 ? 99 : indexB;
      
      return weightA - weightB;
    });
  }, [menuByCategory]);

  const categories = ['All', ...sortedCategoryNames];

  const handleAddToCart = (item: MenuItem, selectedOptions?: Record<string, string[]>, selectedAddOns?: MenuItemAddOn[], quantity: number = 1, finalUnitPrice: number = 0) => {
    const addOnIds = selectedAddOns?.map(a => a.id).join('-') || '';
    const cartId = `${item.id}-${Object.values(selectedOptions || {}).flat().join('-')}-${addOnIds}-${Date.now()}`;
    
    dispatch({
      type: 'ADD_ITEM',
      payload: { 
        ...item, 
        id: cartId, 
        actualId: item.id, 
        selectedOptions, 
        selectedAddOns,
        price: finalUnitPrice,
        quantity 
      } as any,
    });
    toast({ title: 'Added!', description: `${item.name} added to cart.` });
    setSelectionOpen(false);
  };

  const openPreview = (url: string, title?: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  if (!isLoading && !restaurant) notFound();

  return (
    <div className="min-h-screen bg-background">
      <SelectionDialog 
        item={customizingItem}
        open={isSelectionOpen}
        onOpenChange={setSelectionOpen}
        onConfirm={(selections, addOns, qty, totalUnitPrice) => handleAddToCart(customizingItem!, selections, addOns, qty, totalUnitPrice)}
      />
      
      <ImagePreviewDialog 
        url={previewUrl}
        title={previewTitle}
        open={isPreviewOpen}
        onOpenChange={setPreviewOpen}
      />

      {isLoading ? <Skeleton className="h-screen w-full" /> : (
        <>
          <div className="relative h-[220px] w-full">
            <Image 
              src={restaurant?.bannerUrl || ''} 
              alt="banner" 
              fill 
              className="object-cover cursor-pointer"
              onClick={() => openPreview(restaurant?.bannerUrl || '', restaurant?.name)}
            />
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="absolute top-6 left-4 flex gap-2 pt-[env(safe-area-inset-top)]">
                <Button asChild size="icon" className="bg-white/20 backdrop-blur-md rounded-full text-white">
                  <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
            </div>
            <div className="absolute bottom-12 right-4">
               <Button 
                variant="ghost" 
                size="icon" 
                className="bg-white/20 backdrop-blur-md rounded-full text-white"
                onClick={() => openPreview(restaurant?.bannerUrl || '', restaurant?.name)}
               >
                 <ZoomIn className="h-5 w-5" />
               </Button>
            </div>
          </div>

          <div className="bg-background rounded-t-[2.5rem] -mt-10 relative z-10 px-6 pt-8 pb-4 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                   <div 
                    className="h-14 w-14 rounded-xl overflow-hidden border shadow-sm shrink-0 cursor-pointer bg-card"
                    onClick={() => openPreview(restaurant?.logoUrl || '', restaurant?.name)}
                   >
                      <Image src={restaurant?.logoUrl || ''} alt="logo" width={56} height={56} className="object-cover" />
                   </div>
                   <div>
                      <h1 className="text-xl font-black text-foreground">{restaurant?.name}</h1>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">Reliable local delivery partner.</p>
                   </div>
                </div>
                <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-lg text-primary font-bold text-sm">
                   <Star className="h-3.5 w-3.5 fill-primary" />
                   <span>{(restaurant?.rating || 4.5).toFixed(1)}</span>
                </div>
             </div>

             <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-6">
                <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {restaurant?.openingHours}</div>
                <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> nearby</div>
                <div className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] border-muted">30-40 min</Badge></div>
             </div>

             <Tabs defaultValue="menu" className="w-full">
                <TabsList className="w-full bg-transparent border-b rounded-none h-auto p-0 justify-start gap-8">
                   <TabsTrigger value="menu" className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-0 pb-3 font-bold text-sm">Menu</TabsTrigger>
                </TabsList>
                
                <TabsContent value="menu" className="pt-6">
                   <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6">
                      {categories.map(cat => (
                        <Button 
                          key={cat} 
                          variant={selectedMenuCategory === cat ? 'default' : 'outline'}
                          size="sm"
                          className={cn("rounded-full font-bold px-5", selectedMenuCategory === cat ? "bg-orange-500 hover:bg-orange-600" : "bg-card text-muted-foreground")}
                          onClick={() => setSelectedMenuCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                   </div>

                   <div className="space-y-8 pb-20">
                      {sortedCategoryNames.filter((name) => selectedMenuCategory === 'All' || name === selectedMenuCategory).map((catName) => {
                        const items = menuByCategory[catName];
                        return (
                          <div key={catName}>
                            <h2 className="text-lg font-black text-foreground mb-4">{catName}</h2>
                            <div className="space-y-4">
                                {items.map(item => (
                                  <Card key={item.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
                                    <div className="flex items-center p-3 gap-4">
                                      <div 
                                        className="relative h-20 w-20 rounded-xl overflow-hidden shrink-0 cursor-pointer group"
                                        onClick={() => openPreview(item.imageUrl, item.name)}
                                      >
                                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform group-hover:scale-110" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5" />
                                          </div>
                                          {item.isBestseller && (
                                            <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Bestseller</div>
                                          )}
                                      </div>
                                      <div className="flex-1">
                                          <h3 className="font-bold text-sm text-foreground/90">{item.name}</h3>
                                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                                          <p className="text-primary font-black text-sm mt-1">R{item.price.toFixed(2)}</p>
                                      </div>
                                      <Button 
                                        size="icon" 
                                        className="rounded-full h-8 w-8 bg-primary hover:bg-primary/90"
                                        onClick={() => {
                                          setCustomizingItem(item);
                                          setSelectionOpen(true);
                                        }}
                                      >
                                          <Plus className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </Card>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                   </div>
                </TabsContent>
             </Tabs>
          </div>
        </>
      )}
    </div>
  );
}

export default function RestaurantPage() {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <RestaurantContent />
    </Suspense>
  )
}
