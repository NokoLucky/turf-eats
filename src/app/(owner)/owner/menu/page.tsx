'use client';

import { useState } from 'react';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Edit, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';

import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { MenuItem } from '@/lib/data';
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
  restaurantId,
  menuItem,
  onOpenChange,
  open,
}: {
  restaurantId: string;
  menuItem?: MenuItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: menuItem || {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
    },
  });

  const onSubmit = (data: MenuItemFormValues) => {
    if (!firestore || !restaurantId) return;

    const menuItemsCollectionRef = collection(firestore, 'restaurants', restaurantId, 'menuItems');
    
    if (menuItem?.id) {
      // Update existing item
      const docRef = doc(menuItemsCollectionRef, menuItem.id);
      setDocumentNonBlocking(docRef, { ...data, restaurantId }, { merge: true });
      toast({ title: 'Menu item updated!' });
    } else {
      // Add new item: generate ID client-side first
      const newDocRef = doc(menuItemsCollectionRef); // Creates a ref with a new auto-generated ID in the sub-collection
      const newId = newDocRef.id;
      setDocumentNonBlocking(newDocRef, { ...data, id: newId, restaurantId });
      toast({ title: 'Menu item added!' });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{menuItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
          <DialogDescription>Fill in the details for your menu item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | undefined>(undefined);

  // A store owner's user ID is the same as their restaurant's document ID.
  const restaurantId = user?.uid; 

  const menuItemsRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menuItems');
  }, [firestore, restaurantId]);

  const { data: menuItems, isLoading } = useCollection<MenuItem>(menuItemsRef);

  const handleEdit = (item: MenuItem) => {
    setEditingMenuItem(item);
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingMenuItem(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!firestore || !restaurantId) return;
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteDoc(doc(firestore, 'restaurants', restaurantId, 'menuItems', itemId));
    }
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingMenuItem(undefined);
    }
    setDialogOpen(open);
  }

  if (!restaurantId) {
    return <div className="container py-12">Please log in as a store owner.</div>
  }

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold">Manage Your Menu</h1>
          <p className="mt-2 text-muted-foreground">Add, edit, or remove items available at your restaurant.</p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2" />
          Add New Item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({length: 4}).map((_, i) => <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>)}

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
                    <Edit className="mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDelete(item.id)} className="text-destructive">
                    <Trash2 className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
      
       {isDialogOpen && restaurantId && <MenuItemDialog 
          restaurantId={restaurantId} 
          menuItem={editingMenuItem}
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
        />}

    </div>
  );
}

    