
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, doc, query, where, limit } from 'firebase/firestore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Edit, MoreHorizontal, Store, Plus, X, Star } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { MenuItem, Restaurant, MenuItemOptionGroup, MenuItemAddOn } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ImageUploader from '@/components/image-uploader';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name is too short'),
  description: z.string().min(10, 'Description is too short'),
  category: z.string().min(1, 'Please select a category'),
  customCategory: z.string().optional(),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().positive('Price must be positive')
  ),
  imageUrl: z.string().url('An image upload is required.').min(1, 'An image upload is required.'),
  promotionalPrice: z.preprocess(
      (val) => (val === '' || val === null ? undefined : parseFloat(String(val))),
      z.number().nonnegative('Price cannot be negative.').optional()
  ),
  isSoldOut: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  options: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Question wording is required'),
    type: z.enum(['radio', 'checkbox']),
    choices: z.array(z.object({
      name: z.string().min(1, 'Choice name required'),
      price: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val) : val), z.number().default(0))
    })).min(1, 'At least one choice is required'),
    minSelections: z.number().optional(),
    maxSelections: z.number().optional(),
    isRequired: z.boolean().default(false),
  })).optional(),
  addOnsTitle: z.string().optional(),
  addOns: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Add-on name is required'),
    price: z.preprocess(
      (val) => (typeof val === 'string' ? parseFloat(val) : val),
      z.number().nonnegative('Price must be 0 or more')
    ),
  })).optional(),
}).refine(data => {
    if (data.promotionalPrice === undefined || data.promotionalPrice === null) return true;
    if (isNaN(data.price)) return true;
    return data.promotionalPrice < data.price;
}, {
    message: "Promotional price must be less than the original price.",
    path: ["promotionalPrice"],
}).refine((data) => {
  if (data.category === 'Other' && (!data.customCategory || data.customCategory.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Please specify your custom category.",
  path: ["customCategory"],
});


type ProductFormValues = z.infer<typeof productSchema>;

function ProductDialog({
  onSubmit,
  product,
  onOpenChange,
  open,
  storeCategory,
}: {
  onSubmit: (data: ProductFormValues) => void;
  product?: ProductFormValues;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  storeCategory?: string;
}) {
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: '',
      description: '',
      category: '',
      customCategory: '',
      price: 0,
      imageUrl: '',
      promotionalPrice: undefined,
      isSoldOut: false,
      isBestseller: false,
      options: [],
      addOnsTitle: 'Would you like to add extras?',
      addOns: [],
    },
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: "options"
  });

  const { fields: addOnFields, append: appendAddOn, remove: removeAddOn } = useFieldArray({
    control: form.control,
    name: "addOns"
  });
  
  useEffect(() => {
    if (product) {
      const options = getCategoryList(storeCategory);
      const isPredefined = options.includes(product.category);
      
      const migratedOptions = product.options?.map(opt => ({
        ...opt,
        choices: opt.choices.map(c => typeof c === 'string' ? { name: c, price: 0 } : c)
      })) || [];

      form.reset({
        ...product,
        options: migratedOptions,
        category: isPredefined ? product.category : 'Other',
        customCategory: isPredefined ? '' : product.category,
      });
    } else {
      form.reset({ 
        name: '', 
        description: '', 
        category: '', 
        customCategory: '',
        price: 0, 
        imageUrl: '', 
        promotionalPrice: undefined, 
        isSoldOut: false, 
        isBestseller: false,
        options: [],
        addOnsTitle: 'Would you like to add extras?',
        addOns: [] 
      });
    }
  }, [product, form, storeCategory]);

  function getCategoryList(cat?: string) {
    switch (cat) {
      case 'Restaurants':
        return [
          'Breakfast',
          'Meals',
          'Sandwiches & Rolls',
          'Fish & chips',
          'Chicken and Chips',
          'Sides',
          'Extras',
          'Burgers',
          'Meat',
          'Deserts',
          'hot beverages',
          'cold beverages',
          'Other Drinks'
        ];
      case 'Liquor':
        return ['Ciders and Beer', 'Wine', 'Gin', 'Whiskeys', 'Tequila', 'Champagne', 'Cocktails'];
      case 'Pharmacy':
        return ['Self Medication', 'Prescribed Meds', 'Cosmetics'];
      case 'Groceries':
        return ['Fresh Produce', 'Dairy', 'Bakery', 'Snacks', 'Pantry', 'Frozen Goods'];
      default:
        return ['General', 'Other'];
    }
  }

  const categoryOptions = useMemo(() => {
    const list = getCategoryList(storeCategory);
    if (!list.includes('Other')) list.push('Other');
    return list;
  }, [storeCategory]);

  const handleFormSubmit = (data: ProductFormValues) => {
    onSubmit(data);
    onOpenChange(false);
  }

  const addOptionGroup = () => {
    appendOption({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'radio',
      choices: [{ name: '', price: 0 }],
      isRequired: false,
    });
  };

  const addAddOn = () => {
    appendAddOn({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: 0
    });
  };

  const selectedCategory = form.watch('category');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product?.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>Configure your product details and multiple customization questions.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-10">
            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                    <ImageUploader
                        onUploadComplete={(url) => field.onChange(url)}
                        initialImageUrl={field.value}
                        folderName="product-images"
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} className="rounded-xl h-12" placeholder="e.g. Deluxe Cheeseburger" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedCategory === 'Other' && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Specials, Toys, etc." className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} className="rounded-xl min-h-[100px]" placeholder="Describe your product..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Base Price (ZAR)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="rounded-xl h-12 font-bold" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="promotionalPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Promotional Price (Optional)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder="e.g. 89.99" className="rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Separator className="bg-primary/20 h-[2px]" />
            
            {/* CUSTOM QUESTIONS SECTION */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Menu Customizations</h3>
                  <p className="text-xs text-muted-foreground">Add multiple questions (e.g. "Choose your flavor", "Any removals?").</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addOptionGroup} className="rounded-full border-primary text-primary hover:bg-primary/5">
                  <Plus className="h-4 w-4 mr-2" /> Add Question block
                </Button>
              </div>

              <div className="space-y-10">
                {optionFields.map((groupField, groupIndex) => (
                  <Card key={groupField.id} className="relative border-2 border-slate-100 shadow-none rounded-[2.5rem] overflow-hidden">
                    <div className="bg-slate-50 p-6 border-b">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeOption(groupIndex)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      
                      <div className="grid sm:grid-cols-2 gap-6 pr-10">
                        <FormField
                          control={form.control}
                          name={`options.${groupIndex}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question wording</FormLabel>
                              <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. What flavor would you like?" className="rounded-xl h-11 bg-white" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`options.${groupIndex}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selection Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "radio"}>
                                <FormControl><SelectTrigger className="rounded-xl h-11 bg-white"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="radio">Single Choice (Radio)</SelectItem>
                                  <SelectItem value="checkbox">Multiple Choice (Checkbox)</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-center gap-6 mt-4">
                        <FormField
                          control={form.control}
                          name={`options.${groupIndex}.isRequired`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-[10px] font-bold uppercase cursor-pointer">Required Question</FormLabel>
                            </FormItem>
                          )}
                        />
                        {form.watch(`options.${groupIndex}.type`) === 'checkbox' && (
                          <div className="flex items-center gap-4">
                            <FormField
                              control={form.control}
                              name={`options.${groupIndex}.minSelections`}
                              render={({ field }) => (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Min</span>
                                  <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value))} className="w-16 h-8 rounded-lg text-xs text-center" />
                                </div>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`options.${groupIndex}.maxSelections`}
                              render={({ field }) => (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Max</span>
                                  <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value))} className="w-16 h-8 rounded-lg text-xs text-center" />
                                </div>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Choices & Extra Prices</p>
                      
                      <ChoicesList 
                        control={form.control} 
                        groupIndex={groupIndex} 
                      />
                    </div>
                  </Card>
                ))}
                {optionFields.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed rounded-[2.5rem] bg-slate-50/50">
                    <p className="text-sm text-muted-foreground">Add questions to let customers customize their order.</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-primary/20 h-[2px]" />

            {/* ADD-ONS SECTION */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">General Extras</h3>
                    <p className="text-xs text-muted-foreground">Quick list of optional add-ons (e.g. "Extra napkins", "Utensils").</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addAddOn} className="rounded-full border-primary text-primary hover:bg-primary/5">
                    <Plus className="h-4 w-4 mr-2" /> Add Extra Item
                  </Button>
               </div>

               <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                  <FormField
                    control={form.control}
                    name="addOnsTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Header</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. Would you like to add anything else?" className="rounded-xl h-11 bg-white" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                      {addOnFields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                           <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`addOns.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={index > 0 ? "sr-only" : "text-[10px] font-bold text-slate-400 uppercase"}>Item Name</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. Extra Cheese" className="rounded-xl h-11 bg-white shadow-sm" /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                           </div>
                           <div className="w-32">
                              <FormField
                                control={form.control}
                                name={`addOns.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={index > 0 ? "sr-only" : "text-[10px] font-bold text-slate-400 uppercase"}>Extra (ZAR)</FormLabel>
                                    <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder="0.00" className="rounded-xl h-11 bg-white shadow-sm text-center font-bold" /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                           </div>
                           <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl h-11 w-11 text-destructive hover:bg-destructive/10"
                            onClick={() => removeAddOn(index)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      ))}
                  </div>
               </div>
            </div>

            <Separator className="bg-primary/20 h-[2px]" />

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="isSoldOut"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] border-2 border-slate-100 p-6 shadow-none bg-slate-50/50">
                        <div className="space-y-0.5">
                            <FormLabel className="text-sm font-bold">Temporarily Sold Out</FormLabel>
                            <FormDescription className="text-[10px]">
                                Hide from menu until stock arrives.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isBestseller"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] border-2 border-slate-100 p-6 shadow-none bg-slate-50/50">
                        <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-2 text-sm font-bold"><Star className="h-3 w-3 fill-primary text-primary" /> Popular Item</FormLabel>
                            <FormDescription className="text-[10px]">
                                Show a "Bestseller" badge to customers.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />
            </div>
            
            <DialogFooter className="sticky bottom-0 bg-white pt-6 border-t pb-2">
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto rounded-2xl font-black text-lg px-12 h-14 shadow-xl shadow-primary/20">
                {form.formState.isSubmitting ? 'Saving Product...' : 'Save Product Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sub-component for managing the choices list within an option group.
 */
function ChoicesList({ control, groupIndex }: { control: any, groupIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `options.${groupIndex}.choices`
  });

  return (
    <div className="space-y-3">
      {fields.map((choiceField, choiceIndex) => (
        <div key={choiceField.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex-1">
            <FormField
              control={control}
              name={`options.${groupIndex}.choices.${choiceIndex}.name`}
              render={({ field }) => (
                <FormControl><Input {...field} value={field.value || ''} placeholder="Choice name (e.g. Vanilla)" className="rounded-xl h-10 bg-white border-slate-200" /></FormControl>
              )}
            />
          </div>
          <div className="w-28">
            <FormField
              control={control}
              name={`options.${groupIndex}.choices.${choiceIndex}.price`}
              render={({ field }) => (
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">+R</span>
                    <Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder="0.00" className="rounded-xl h-10 bg-white border-slate-200 pl-8 text-xs font-bold text-center" />
                  </div>
                </FormControl>
              )}
            />
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-slate-300 hover:text-destructive rounded-xl"
            onClick={() => remove(choiceIndex)}
            disabled={fields.length === 1}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="text-[10px] font-bold uppercase text-primary h-8 hover:bg-primary/5 rounded-lg"
        onClick={() => append({ name: '', price: 0 })}
      >
        <Plus className="h-3 w-3 mr-1" /> Add Another Choice
      </Button>
    </div>
  );
}

export default function ProductsManagementPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormValues | undefined>(undefined);

  const restaurantQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'restaurants'), where('storeOwnerId', '==', user.uid), limit(1));
  }, [user, firestore]);

  const { data: restaurants, isLoading: isRestaurantLoading } = useCollection<Restaurant>(restaurantQuery);
  const restaurant = restaurants?.[0];
  const restaurantId = restaurant?.id;

  const menuItemsRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menuItems');
  }, [firestore, restaurantId]);

  const { data: products, isLoading: isMenuLoading } = useCollection<MenuItem>(menuItemsRef);


  const handleSubmitProduct = (data: ProductFormValues) => {
    if (!firestore || !restaurantId) {
      toast({ title: 'Error', description: 'Could not find store to save product to.', variant: 'destructive' });
      return;
    }
    
    const { id, category, customCategory, ...restData } = data;

    const firestoreData = {
        ...restData,
        category: category === 'Other' ? (customCategory || 'Other') : category,
        promotionalPrice: data.promotionalPrice && data.promotionalPrice > 0 ? data.promotionalPrice : null,
    };

    if (id) {
        const docRef = doc(firestore, 'restaurants', restaurantId, 'menuItems', id);
        setDocumentNonBlocking(docRef, firestoreData, { merge: true });
        toast({ title: 'Product updated!' });
    } else {
        const productsCollectionRef = collection(firestore, 'restaurants', restaurantId, 'menuItems');
        addDocumentNonBlocking(productsCollectionRef, { ...firestoreData, restaurantId });
        toast({ title: 'Product added!' });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingProduct({
        ...item,
        price: Number(item.price),
        promotionalPrice: item.promotionalPrice ? Number(item.promotionalPrice) : undefined,
    } as ProductFormValues);
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingProduct(undefined);
    setDialogOpen(true);
  };

  const handleDelete = (itemId: string) => {
    if (!firestore || !restaurantId) {
      toast({ title: 'Error', description: 'Could not find store to delete product from.', variant: 'destructive' });
      return;
    }
    
    if (confirm('Are you sure you want to delete this product?')) {
      const docRef = doc(firestore, 'restaurants', restaurantId, 'menuItems', itemId);
      deleteDocumentNonBlocking(docRef);
      toast({
        title: "Product Deletion Initiated",
        description: "The product will be removed shortly.",
        variant: 'destructive',
      });
    }
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingProduct(undefined);
    }
    setDialogOpen(open);
  }

  const isLoading = !firestore || isRestaurantLoading || isMenuLoading;

  if (isRestaurantLoading && !restaurant) {
    return <div className="container py-12 px-4 sm:px-8"><Skeleton className="h-8 w-64 mb-8" /><Skeleton className="h-10 w-40" /></div>
  }

  if (!isRestaurantLoading && !restaurant) {
    return (
      <div className="container py-12 px-4 sm:px-8 text-center">
        <Store className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 font-headline text-2xl font-bold">No Store Found</h1>
        <p className="mt-2 text-muted-foreground">
          Please create your store profile before adding products.
        </p>
        <Button asChild className="mt-4 rounded-xl">
          <a href="/owner/restaurant">Create Store</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-headline text-4xl font-bold">Manage Your Products</h1>
          {restaurant && <p className="mt-2 text-muted-foreground">Add, edit, or remove products for <span className="font-semibold text-primary">{restaurant.name}</span>.</p>}
        </div>
        <Button onClick={handleAddNew} disabled={!restaurantId} className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({length: 4}).map((_, i) => <Card key={i} className="border-none shadow-premium rounded-[2rem] overflow-hidden"><CardContent className="p-4 space-y-2"><Skeleton className="aspect-video w-full rounded-2xl" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>)}

        {!isLoading && products?.map((item) => (
          <Card key={item.id} className={cn("border-none shadow-premium rounded-[2rem] overflow-hidden group flex flex-col h-full", item.isSoldOut && "opacity-60")}>
            <CardHeader className="p-0 relative">
              <div className="relative aspect-video w-full overflow-hidden">
                <Image src={item.imageUrl || 'https://picsum.photos/seed/product/400/300'} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" />
                 {item.isSoldOut && (
                    <Badge variant="destructive" className="absolute top-4 right-4 shadow-lg uppercase font-bold text-[10px]">SOLD OUT</Badge>
                )}
                 {item.isBestseller && !item.isSoldOut && (
                    <Badge className="absolute top-4 right-4 bg-orange-50 text-white shadow-lg uppercase font-bold text-[10px] border-none"><Star className="h-2 w-2 mr-1 fill-white" /> BESTSELLER</Badge>
                )}
                <Badge variant="secondary" className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-primary font-bold text-[10px] border-none">
                  {item.category || 'General'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col">
              <CardTitle className="font-headline text-xl group-hover:text-primary transition-colors">{item.name}</CardTitle>
              <CardDescription className="mt-1 h-12 overflow-hidden text-ellipsis line-clamp-2">
                {item.description}
              </CardDescription>
              {(item.options || item.addOns) && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {item.options?.map(opt => (
                    <Badge key={opt.id} variant="outline" className="text-[9px] uppercase border-primary/20 text-primary bg-primary/5">
                      {opt.name}
                    </Badge>
                  ))}
                  {item.addOns?.map(addon => (
                    <Badge key={addon.id} variant="outline" className="text-[9px] uppercase border-orange-200 text-orange-600 bg-orange-50">
                      + {addon.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center p-6 pt-0">
              <div className="flex flex-col">
                <p className="text-lg font-bold text-primary">R{(item.promotionalPrice && item.promotionalPrice > 0 ? item.promotionalPrice : item.price).toFixed(2)}</p>
                {item.promotionalPrice && item.promotionalPrice > 0 && <p className="text-xs font-medium text-muted-foreground line-through">R{item.price.toFixed(2)}</p>}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-none shadow-premium">
                  <DropdownMenuItem onSelect={() => handleEdit(item)} className="rounded-lg cursor-pointer font-bold">
                    <Edit className="mr-2 h-4 w-4" /> Edit Product
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDelete(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer font-bold">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
      
       {!isLoading && (!products || products.length === 0) && (
          <div className="text-center py-20 bg-white rounded-[3rem] shadow-premium">
             <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusCircle className="h-10 w-10 text-primary/30" />
             </div>
             <h2 className="text-xl font-bold">No products yet</h2>
             <p className="text-muted-foreground mt-1">Start adding items to your store menu.</p>
          </div>
       )}

       {isDialogOpen && (
        <ProductDialog 
          onSubmit={handleSubmitProduct}
          product={editingProduct}
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
          storeCategory={restaurant?.category}
        />
      )}

    </div>
  );
}
