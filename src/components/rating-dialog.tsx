'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import type { Order } from '@/lib/data';
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

const ratingSchema = z.object({
  restaurantRating: z.number().min(1, 'Please select a rating for the restaurant.'),
  restaurantComment: z.string().optional(),
  driverRating: z.number().min(1, 'Please select a rating for the driver.').optional(),
  driverComment: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

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
      const batch = writeBatch(firestore);

      // 1. Create the new rating document
      const ratingRef = doc(collection(firestore, 'ratings'));
      const ratingData = {
          ...data,
          orderId: order.id,
          customerId: user.uid,
          restaurantId: order.restaurantId,
          driverId: order.driverId,
          createdAt: serverTimestamp(),
      };
      batch.set(ratingRef, ratingData);

      // 2. Update the order to mark it as rated
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
