'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { Order, Rating, Driver } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from '@/components/ui/star-rating';
import { Separator } from './ui/separator';

interface RatingDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRatingSubmitted: () => void;
}

export function RatingDialog({ order, open, onOpenChange, onRatingSubmitted }: RatingDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const ratingSchema = z.object({
    restaurantRating: z.number().min(1, 'Please select a rating for the restaurant.'),
    restaurantComment: z.string().optional(),
    driverRating: order?.driverId
      ? z.number().min(1, 'Please select a rating for the driver.')
      : z.number().optional(),
    driverComment: z.string().optional(),
  });

  type RatingFormValues = z.infer<typeof ratingSchema>;

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      restaurantRating: 0,
      restaurantComment: '',
      driverRating: 0,
      driverComment: '',
    },
  });

  const calculateNewAverage = async (targetId: string, targetField: 'restaurantId' | 'driverId', newRating: number) => {
    if (!firestore) return newRating;
    const ratingsQuery = query(
      collection(firestore, 'ratings'),
      where(targetField, '==', targetId)
    );
    const ratingsSnapshot = await getDocs(ratingsQuery);
    const existingRatings = ratingsSnapshot.docs.map(
      (doc) => (doc.data() as Rating)[targetField === 'restaurantId' ? 'restaurantRating' : 'driverRating'] || 0
    );
    
    const newTotalRating = existingRatings.reduce((sum, r) => sum + r, 0) + newRating;
    const newTotalCount = existingRatings.length + 1;
    return newTotalRating / newTotalCount;
  };

  const onSubmit = async (data: RatingFormValues) => {
    if (!firestore || !user || !order) return;

    try {
      const batch = writeBatch(firestore);

      // 1. Calculate and update Restaurant Average
      const newRestaurantAvg = await calculateNewAverage(order.restaurantId, 'restaurantId', data.restaurantRating);
      const restaurantRef = doc(firestore, 'restaurants', order.restaurantId);
      batch.update(restaurantRef, { rating: newRestaurantAvg });

      // 2. Calculate and update Driver Average (if applicable)
      if (order.driverId && data.driverRating && data.driverRating > 0) {
        const newDriverAvg = await calculateNewAverage(order.driverId, 'driverId', data.driverRating);
        const driverRef = doc(firestore, `users/${order.driverId}/drivers/${order.driverId}`);
        batch.update(driverRef, { rating: newDriverAvg });
      }

      // 3. Create the new rating document
      const newRatingRef = doc(collection(firestore, 'ratings'));
      const ratingData: any = {
        restaurantRating: data.restaurantRating,
        restaurantComment: data.restaurantComment,
        orderId: order.id,
        customerId: user.uid,
        restaurantId: order.restaurantId,
        createdAt: serverTimestamp(),
      };

      if (order.driverId && data.driverRating && data.driverRating > 0) {
        ratingData.driverId = order.driverId;
        ratingData.driverRating = data.driverRating;
        if (data.driverComment) {
          ratingData.driverComment = data.driverComment;
        }
      }

      batch.set(newRatingRef, ratingData);

      // 4. Update the order to mark it as rated
      const orderRef = doc(firestore, 'orders', order.id);
      batch.update(orderRef, { isRated: true });

      await batch.commit();

      toast({
        title: 'Rating Submitted!',
        description: 'Thank you for your feedback.',
      });

      onRatingSubmitted();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Could not submit your rating.',
      });
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] border-none shadow-premium">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Rate Your Order</DialogTitle>
          <DialogDescription>
            Let us know how we did. Your feedback helps everyone in Turfloop.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-primary/5 p-6 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-primary">Rate the Restaurant</h3>
              <FormField
                control={form.control}
                name="restaurantRating"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <StarRating value={field.value} onChange={field.onChange} size={32} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="restaurantComment"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Comment (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What did you think of the food?" {...field} className="rounded-xl bg-white border-none shadow-sm" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            {order.driverId && (
              <div className="bg-secondary/50 p-6 rounded-2xl">
                <h3 className="font-bold mb-3 flex items-center gap-2">Rate the Delivery</h3>
                   <FormField
                    control={form.control}
                    name="driverRating"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <StarRating value={field.value || 0} onChange={field.onChange} size={32} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="driverComment"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Comment (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="How was the delivery experience?" {...field} className="rounded-xl bg-white border-none shadow-sm" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </div>
            )}
            
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}