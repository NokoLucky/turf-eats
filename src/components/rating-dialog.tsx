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

  const onSubmit = async (data: RatingFormValues) => {
    if (!firestore || !user || !order) return;

    try {
      // 1. Fetch all existing ratings for the restaurant to calculate the new average.
      const ratingsQuery = query(
        collection(firestore, 'ratings'),
        where('restaurantId', '==', order.restaurantId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);

      const existingRatings = ratingsSnapshot.docs.map(
        (doc) => (doc.data() as Rating).restaurantRating
      );
      
      const newTotalRating = existingRatings.reduce((sum, r) => sum + r, 0) + data.restaurantRating;
      const newTotalCount = existingRatings.length + 1;
      const newAverageRating = newTotalRating / newTotalCount;

      const batch = writeBatch(firestore);

      // 2. Create the new rating document
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

      // 3. Update the order to mark it as rated
      const orderRef = doc(firestore, 'orders', order.id);
      batch.update(orderRef, { isRated: true });
      
      // 4. Update the restaurant document with the new average rating
      const restaurantRef = doc(firestore, 'restaurants', order.restaurantId);
      batch.update(restaurantRef, { rating: newAverageRating });

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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Rate Your Order</DialogTitle>
          <DialogDescription>
            Let us know how we did. Your feedback helps everyone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Rate the Restaurant</h3>
              <FormField
                control={form.control}
                name="restaurantRating"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <StarRating value={field.value} onChange={field.onChange} />
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
                    <FormLabel>Comment (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What did you think of the food?" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            {order.driverId && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Rate the Delivery</h3>
                   <FormField
                    control={form.control}
                    name="driverRating"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <StarRating value={field.value || 0} onChange={field.onChange} />
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
                        <FormLabel>Comment (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="How was the delivery experience?" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
