
'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Rating } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Star, Quote } from 'lucide-react';

export default function OwnerRatingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ratingsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'ratings'),
      where('restaurantId', '==', user.uid), // This logic depends on restaurantId = ownerId in your data init
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  // Fallback: If ownerId isn't restaurantId, we need to fetch the restaurant first.
  // Assuming restaurant ID is accessible via query...
  const restaurantQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'restaurants'), where('storeOwnerId', '==', user.uid));
  }, [user, firestore]);
  const { data: restaurants } = useCollection(restaurantQuery);
  const restaurantId = restaurants?.[0]?.id;

  const actualRatingsQuery = useMemoFirebase(() => {
    if (!restaurantId || !firestore) return null;
    return query(
      collection(firestore, 'ratings'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
  }, [restaurantId, firestore]);

  const { data: ratings, isLoading } = useCollection<Rating>(actualRatingsQuery);

  const averageRating = useMemo(() => {
    if (!ratings || ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.restaurantRating, 0) / ratings.length;
  }, [ratings]);

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mb-10">
        <h1 className="font-headline text-4xl font-bold">Store Ratings</h1>
        <p className="text-muted-foreground mt-2">See what your customers are saying about your products and service.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Card className="border-none shadow-premium rounded-[2rem] bg-primary text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold opacity-70 uppercase tracking-widest">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-5xl font-black">{averageRating.toFixed(1)}</span>
              <div className="flex flex-col">
                 <Star className="h-6 w-6 fill-white text-white" />
                 <span className="text-[10px] font-bold uppercase">{ratings?.length || 0} REVIEWS</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
           Array.from({ length: 3 }).map((_, i) => (
             <Card key={i} className="border-none shadow-premium rounded-[2rem] p-6 space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
             </Card>
           ))
        ) : ratings?.map((rating) => (
          <Card key={rating.id} className="border-none shadow-premium rounded-[2rem] overflow-hidden bg-card border border-border/50 group">
             <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                         <Quote className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                            {rating.createdAt ? format(rating.createdAt.toDate(), 'PPP') : 'Recently'}
                         </p>
                         <StarRating value={rating.restaurantRating} onChange={() => {}} size={18} className="pointer-events-none" />
                      </div>
                   </div>
                   <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest py-1 border-muted">
                      Order #{rating.orderId.slice(0, 8)}
                   </Badge>
                </div>
                
                {rating.restaurantComment && (
                  <div className="relative">
                    <p className="text-lg font-medium text-foreground/90 italic leading-relaxed">
                       "{rating.restaurantComment}"
                    </p>
                  </div>
                )}
             </CardContent>
          </Card>
        ))}

        {!isLoading && (!ratings || ratings.length === 0) && (
          <div className="text-center py-32 bg-card rounded-[3rem] border-2 border-dashed">
             <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
             <h2 className="text-xl font-bold">No reviews yet</h2>
             <p className="text-muted-foreground mt-1">Once customers rate their orders, you'll see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
