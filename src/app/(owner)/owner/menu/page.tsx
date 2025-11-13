'use client';

import { useState, useEffect } from 'react';
import { collection, doc, query, where, limit } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Edit, MoreHorizontal, ChefHat } from 'lucide-react';
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

const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name is too short'),
  description: z.string().min(10, 'Description is too short'),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().positive('Price must be positive')),
  imageUrl: z.string().url('Must be a valid image URL'),
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

function MenuItemDialog({
  onSubmit,
  menuItem,
  onOpenChange,
  open,
}: {
  onSubmit: (data: MenuItemFormValues) => void;
  menuItem?: MenuItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: menuItem || {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
    },
  });
  
  useEffect(() => {
    // Reset form when the menuItem prop changes
    form.reset(menuItem || { name: '', description: '', price: 0, imageUrl: '' });
  }, [menuItem, form]);

  const handleFormSubmit = (data: MenuItemFormValues) => {
    console.log('[Dialog] Form submitted with data:', data);
    onSubmit(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{menuItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
          <DialogDescription>Fill in the details for your menu item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
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
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/image.jpg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MenuManagementPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | undefined>(undefined);

  const restaurantQuery = useMemoFirebase(() => {
    if (!user || !firestore) {
      console.log('DEBUG: User or Firestore not available for restaurantQuery.');
      return null;
    }
    console.log('DEBUG: Creating restaurantQuery for user:', user.uid);
    return query(collection(firestore, 'restaurants'), where('storeOwnerId', '==', user.uid), limit(1));
  }, [user, firestore]);

  const { data: restaurants, isLoading: isRestaurantLoading } = useCollection<Restaurant>(restaurantQuery);
  const restaurant = restaurants?.[0];
  const restaurantId = restaurant?.id;

  const menuItemsRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) {
       console.log('DEBUG: Firestore or restaurantId not available for menuItemsRef.');
      return null;
    }
    console.log('DEBUG: Creating menuItemsRef for restaurantId:', restaurantId);
    return collection(firestore, 'restaurants', restaurantId, 'menuItems');
  }, [firestore, restaurantId]);

  const { data: menuItems, isLoading: isMenuLoading } = useCollection<MenuItem>(menuItemsRef);

  useEffect(() => {
    console.log('DEBUG: restaurant data:', restaurant);
    console.log('DEBUG: restaurantId:', restaurantId);
    console.log('DEBUG: menuItems data:', menuItems);
  }, [restaurant, restaurantId, menuItems]);


  const handleSubmitMenuItem = (data: MenuItemFormValues) => {
    console.log('[handleSubmitMenuItem] Received data:', data);
    if (!firestore || !restaurantId) {
      console.error('[handleSubmitMenuItem] Firestore or restaurantId is missing.');
      toast({ title: 'Error', description: 'Could not find restaurant to save item to.', variant: 'destructive' });
      return;
    }

    const menuItemsCollectionRef = collection(firestore, 'restaurants', restaurantId, 'menuItems');
    
    if (editingMenuItem?.id) {
      console.log(`[handleSubmitMenuItem] Updating item ID: ${editingMenuItem.id}`);
      const docRef = doc(menuItemsCollectionRef, editingMenuItem.id);
      console.log('[handleSubmitMenuItem] Update doc path:', docRef.path);
      setDocumentNonBlocking(docRef, data, { merge: true });
      toast({ title: 'Menu item updated!' });
    } else {
      console.log('[handleSubmitMenuItem] Adding new item.');
      addDocumentNonBlocking(menuItemsCollectionRef, { ...data, restaurantId });
      toast({ title: 'Menu item added!' });
    }
  };

  const handleEdit = (item: MenuItem) => {
    console.log('[handleEdit] Editing item:', item);
    setEditingMenuItem(item);
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    console.log('[handleAddNew] Adding new item.');
    setEditingMenuItem(undefined);
    setDialogOpen(true);
  };

  const handleDelete = (itemId: string) => {
    console.log(`[handleDelete] Attempting to delete item ID: ${itemId}`);
    if (!firestore || !restaurantId) {
      console.error('[handleDelete] Firestore or restaurantId is missing.');
      toast({ title: 'Error', description: 'Could not find restaurant to delete item from.', variant: 'destructive' });
      return;
    }
    
    if (confirm('Are you sure you want to delete this item?')) {
      const docRef = doc(firestore, 'restaurants', restaurantId, 'menuItems', itemId);
      console.log('[handleDelete] Delete doc path:', docRef.path);
      deleteDocumentNonBlocking(docRef);
      toast({
        title: "Item Deletion Initiated",
        description: "The menu item will be removed shortly.",
        variant: 'destructive',
      });
    }
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      console.log('[handleDialogChange] Dialog closing, clearing editingMenuItem.');
      setEditingMenuItem(undefined);
    }
    setDialogOpen(open);
  }

  const isLoading = isRestaurantLoading || isMenuLoading;

  if (isRestaurantLoading) {
    return <div className="container py-12"><Skeleton className="h-8 w-64 mb-8" /><Skeleton className="h-10 w-40" /></div>
  }

  if (!restaurant) {
    return (
      <div className="container py-12 text-center">
        <ChefHat className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 font-headline text-2xl font-bold">No Restaurant Found</h1>
        <p className="mt-2 text-muted-foreground">
          Please create your restaurant profile before adding menu items.
        </p>
        <Button asChild className="mt-4">
          <a href="/owner/restaurant">Create Restaurant</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold">Manage Your Menu</h1>
          <p className="mt-2 text-muted-foreground">Add, edit, or remove items for <span className="font-semibold text-primary">{restaurant.name}</span>.</p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2" />
          Add New Item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isMenuLoading && Array.from({length: 4}).map((_, i) => <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>)}

        {menuItems?.map((item) => (
          <Card key={item.id}>
            <CardHeader className="p-0">
              <div className="relative aspect-video w-full overflow-hidden">
                <Image src={item.imageUrl || 'https://picsum.photos/seed/menuitem/400/300'} alt={item.name} fill className="object-cover" />
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
        <MenuItemDialog 
          onSubmit={handleSubmitMenuItem}
          menuItem={editingMenuItem}
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
        />
      )}

    </div>
  );
}
