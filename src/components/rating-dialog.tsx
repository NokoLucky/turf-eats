
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { Order, Rating } from '@/lib/data';
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
import { StarRating } from '@/components/ui/star-rating';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface RatingDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRatingSubmitted: () => void;
}

export function RatingDialog({ order, open, onOpenChange, onRatingSubmitted }: RatingDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

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

    // 1. Calculate Averages (Reads are performed before mutations)
    const newRestaurantAvg = await calculateNewAverage(order.restaurantId, 'restaurantId', data.restaurantRating);
    
    let newDriverAvg: number | null = null;
    if (order.driverId && data.driverRating && data.driverRating > 0) {
      newDriverAvg = await calculateNewAverage(order.driverId, 'driverId', data.driverRating);
    }

    const batch = writeBatch(firestore);

    // 2. Prepare Restaurant Update (Using set with merge to be idempotent)
    const restaurantRef = doc(firestore, 'restaurants', order.restaurantId);
    batch.set(restaurantRef, { rating: newRestaurantAvg }, { merge: true });

    // 3. Prepare Driver Update (if applicable, using set with merge)
    if (order.driverId && newDriverAvg !== null) {
      const driverRef = doc(firestore, `users/${order.driverId}/drivers/${order.driverId}`);
      batch.set(driverRef, { rating: newDriverAvg }, { merge: true });
    }

    // 4. Create Rating Document
    const newRatingRef = doc(collection(firestore, 'ratings'));
    const ratingData: any = {
      restaurantRating: data.restaurantRating,
      restaurantComment: data.restaurantComment || '',
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

    // 5. Mark Order as Rated
    const orderRef = doc(firestore, 'orders', order.id);
    batch.update(orderRef, { isRated: true });

    // 6. Commit Mutations (Non-blocking as per guidelines)
    batch.commit()
      .then(() => {
        onRatingSubmitted();
        onOpenChange(false);
        form.reset();
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'orders/ratings/batch',
          operation: 'write',
          requestResourceData: ratingData,
        } satisfies SecurityRuleContext);

        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-primary p-8 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white">Rate Your Order</DialogTitle>
            <DialogDescription className="text-white/80 text-base">
              Share your experience to help the community and reward local excellence.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                Store Experience
              </h3>
              <FormField
                control={form.control}
                name="restaurantRating"
                render={({ field }) => (
                  <FormItem className="bg-primary/5 p-6 rounded-2xl">
                    <FormControl>
                      <StarRating value={field.value} onChange={field.onChange} size={40} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="restaurantComment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="What did you think of the products?" 
                        {...field} 
                        className="rounded-2xl bg-secondary/50 border-none shadow-sm min-h-[100px] resize-none" 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            {order.driverId && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                   <div className="w-1.5 h-6 bg-primary rounded-full" />
                   Delivery Experience
                </h3>
                   <FormField
                    control={form.control}
                    name="driverRating"
                    render={({ field }) => (
                    <FormItem className="bg-primary/5 p-6 rounded-2xl">
                        <FormControl>
                        <StarRating value={field.value || 0} onChange={field.onChange} size={40} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="driverComment"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="How was the delivery service?" 
                            {...field} 
                            className="rounded-2xl bg-secondary/50 border-none shadow-sm min-h-[100px] resize-none" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </div>
            )}
            
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20">
                {form.formState.isSubmitting ? 'Sending Feedback...' : 'Submit Review'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
