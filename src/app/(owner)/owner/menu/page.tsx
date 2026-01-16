'use client';

import { useState, useEffect } from 'react';
import { collection, doc, query, where, limit } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Edit, MoreHorizontal, Store, Package } from 'lucide-react';
import Image from 'next/image';

import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { MenuItem, Restaurant } from '@/lib/data';
import { Button } from '@/components/ui/button';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ImageUploader from '@/components/image-uploader';

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name is too short'),
  description: z.string().min(10, 'Description is too short'),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().positive('Price must be positive')),
  imageUrl: z.string().url('An image upload is required.').min(1, 'An image upload is required.'),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ProductDialog({
  onSubmit,
  product,
  onOpenChange,
  open,
}: {
  onSubmit: (data: ProductFormValues) => void;
  product?: ProductFormValues;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
    },
  });
  
  useEffect(() => {
    form.reset(product || { name: '', description: '', price: 0, imageUrl: '' });
  }, [product, form]);

  const handleFormSubmit = (data: ProductFormValues) => {
    onSubmit(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product?.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>Fill in the details for your product.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (ZAR)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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

    const productsCollectionRef = collection(firestore, 'restaurants', restaurantId, 'menuItems');
    
    if (data.id) {
      const docRef = doc(productsCollectionRef, data.id);
      const { id, ...updateData } = data; // Don't save the id inside the document
      setDocumentNonBlocking(docRef, updateData, { merge: true });
      toast({ title: 'Product updated!' });
    } else {
      addDocumentNonBlocking(productsCollectionRef, { ...data, restaurantId });
      toast({ title: 'Product added!' });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingProduct(item);
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
    return <div className="container py-12"><Skeleton className="h-8 w-64 mb-8" /><Skeleton className="h-10 w-40" /></div>
  }

  if (!isRestaurantLoading && !restaurant) {
    return (
      <div className="container py-12 text-center">
        <Store className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 font-headline text-2xl font-bold">No Store Found</h1>
        <p className="mt-2 text-muted-foreground">
          Please create your store profile before adding products.
        </p>
        <Button asChild className="mt-4">
          <a href="/owner/restaurant">Create Store</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold">Manage Your Products</h1>
          {restaurant && <p className="mt-2 text-muted-foreground">Add, edit, or remove products for <span className="font-semibold text-primary">{restaurant.name}</span>.</p>}
        </div>
        <Button onClick={handleAddNew} disabled={!restaurantId}>
          <PlusCircle className="mr-2" />
          Add New Product
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({length: 4}).map((_, i) => <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>)}

        {products?.map((item) => (
          <Card key={item.id}>
            <CardHeader className="p-0">
              <div className="relative aspect-video w-full overflow-hidden">
                <Image src={item.imageUrl || 'https://picsum.photos/seed/product/400/300'} alt={item.name} fill className="object-cover" />
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <CardTitle className="font-headline text-xl">{item.name}</CardTitle>
              <CardDescription className="mt-1 h-10 overflow-hidden text-ellipsis">
                {item.description}
              </CardDescription>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 pt-0">
              <p className="text-lg font-bold text-primary">R{item.price.toFixed(2)}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => handleEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDelete(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
      
       {isDialogOpen && (
        <ProductDialog 
          onSubmit={handleSubmitProduct}
          product={editingProduct}
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
        />
      )}

    </div>
  );
}
