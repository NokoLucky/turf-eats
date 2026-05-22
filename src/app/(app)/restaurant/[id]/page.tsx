
'use client';

import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { Star, Plus, ArrowLeft, LayoutGrid, Check, X, Clock, MapPin, ShoppingCart, ZoomIn } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';
import type { Restaurant, MenuItem, MenuItemOptionGroup, MenuItemAddOn } from '@/lib/data';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  onConfirm: (selections: Record<string, string[]>, addOns: MenuItemAddOn[], quantity: number) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<MenuItemAddOn[]>([]);
  const [quantity, setQuantity] = useState(1);

  const totalPrice = useMemo(() => {
    if (!item) return 0;
    const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    return (item.price + addOnTotal) * quantity;
  }, [item, selectedAddOns, quantity]);

  useEffect(() => {
    if (open && item) {
      const initial: Record<string, string[]> = {};
      if (item.options) {
        item.options.forEach(opt => {
          initial[opt.name] = opt.type === 'radio' ? [opt.choices[0]] : [];
        });
      }
      setSelections(initial);
      setSelectedAddOns([]);
      setQuantity(1);
    }
  }, [open, item]);

  if (!item) return null;

  const handleCheckboxChange = (groupName: string, choice: string, checked: boolean, max?: number) => {
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

  const handleAddOnToggle = (addon: MenuItemAddOn, checked: boolean) => {
    setSelectedAddOns(prev => 
      checked ? [...prev, addon] : prev.filter(a => a.id !== addon.id)
    );
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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] border-none shadow-2xl h-[90vh] flex flex-col">
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
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{item.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
            </div>
            {item.isBestseller && (
              <Badge variant="secondary" className="bg-orange-100 text-primary border-none text-[10px] font-bold">Bestseller</Badge>
            )}
          </div>
          
          <div className="text-xl font-bold text-primary">R{item.price.toFixed(2)}</div>

          {item.options?.map((group, index) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center justify-between bg-[#F8F9FA] -mx-6 px-6 py-3">
                <h4 className="font-bold text-sm">{index + 1}. {group.name} <span className="text-muted-foreground font-normal ml-1">(Select {group.maxSelections || 1})</span></h4>
                {group.isRequired && <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-none">REQUIRED</Badge>}
              </div>

              <div className="space-y-3">
                {group.choices.map((choice) => {
                  const isChecked = selections[group.name]?.includes(choice);
                  return (
                    <div 
                      key={choice} 
                      className="flex items-center justify-between py-1 cursor-pointer"
                      onClick={() => {
                        if (group.type === 'radio') setSelections(prev => ({ ...prev, [group.name]: [choice] }));
                        else handleCheckboxChange(group.name, choice, !isChecked, group.maxSelections);
                      }}
                    >
                      <Label className="font-medium text-sm cursor-pointer">{choice}</Label>
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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {item.addOns && item.addOns.length > 0 && (
            <div className="space-y-4">
               <div className="bg-[#F8F9FA] -mx-6 px-6 py-3">
                  <h4 className="font-bold text-sm">Add-ons</h4>
               </div>
               <div className="space-y-4">
                  {item.addOns.map((addon) => {
                    const isChecked = selectedAddOns.some(a => a.id === addon.id);
                    return (
                      <div key={addon.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Checkbox 
                              id={`addon-${addon.id}`} 
                              checked={isChecked}
                              onCheckedChange={(checked) => handleAddOnToggle(addon, !!checked)}
                            />
                            <Label htmlFor={`addon-${addon.id}`} className="text-sm font-medium cursor-pointer">{addon.name}</Label>
                         </div>
                         <span className="text-sm text-muted-foreground font-medium">+ R{addon.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t shrink-0">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center bg-[#F1F3F5] rounded-full px-3 py-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
            <Button 
              onClick={() => onConfirm(selections, selectedAddOns, quantity)} 
              disabled={!isValid()} 
              className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-primary/20 flex justify-between px-6"
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

  const handleAddToCart = (item: MenuItem, selectedOptions?: Record<string, string[]>, selectedAddOns?: MenuItemAddOn[], quantity: number = 1) => {
    const addOnIds = selectedAddOns?.map(a => a.id).join('-') || '';
    const cartId = `${item.id}-${Object.values(selectedOptions || {}).flat().join('-')}-${addOnIds}`;
    
    // Calculate accurate unit price including add-ons
    const addOnPrice = selectedAddOns?.reduce((sum, a) => sum + a.price, 0) || 0;
    const finalUnitPrice = item.price + addOnPrice;

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
    <div className="min-h-screen bg-[#F8F9FA]">
      <SelectionDialog 
        item={customizingItem}
        open={isSelectionOpen}
        onOpenChange={setSelectionOpen}
        onConfirm={(selections, addOns, qty) => handleAddToCart(customizingItem!, selections, addOns, qty)}
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
            <div className="absolute top-6 left-4 flex gap-2">
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

          <div className="bg-white rounded-t-[2.5rem] -mt-10 relative z-10 px-6 pt-8 pb-4 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                   <div 
                    className="h-14 w-14 rounded-xl overflow-hidden border shadow-sm shrink-0 cursor-pointer"
                    onClick={() => openPreview(restaurant?.logoUrl || '', restaurant?.name)}
                   >
                      <Image src={restaurant?.logoUrl || ''} alt="logo" width={56} height={56} className="object-cover" />
                   </div>
                   <div>
                      <h1 className="text-xl font-bold">{restaurant?.name}</h1>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">Great food. Great experience.</p>
                   </div>
                </div>
                <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg text-primary font-bold text-sm">
                   <Star className="h-3.5 w-3.5 fill-primary" />
                   <span>{(restaurant?.rating || 4.5).toFixed(1)}</span>
                </div>
             </div>

             <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-6">
                <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {restaurant?.openingHours}</div>
                <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> 1.5 km</div>
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
                          className={cn("rounded-full font-bold px-5", selectedMenuCategory === cat ? "bg-orange-500 hover:bg-orange-600" : "bg-white text-muted-foreground")}
                          onClick={() => setSelectedMenuCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                   </div>

                   <div className="space-y-8">
                      {sortedCategoryNames.filter((name) => selectedMenuCategory === 'All' || name === selectedMenuCategory).map((catName) => {
                        const items = menuByCategory[catName];
                        return (
                          <div key={catName}>
                            <h2 className="text-lg font-bold mb-4">{catName}</h2>
                            <div className="space-y-4">
                                {items.map(item => (
                                  <Card key={item.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
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
                                          <h3 className="font-bold text-sm">{item.name}</h3>
                                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                                          <p className="text-primary font-bold text-sm mt-1">R{item.price.toFixed(2)}</p>
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
