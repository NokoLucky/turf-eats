import Image from 'next/image';
import Link from 'next/link';
import { Star, Utensils } from 'lucide-react';
import { restaurants } from '@/lib/data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function RestaurantsPage() {
  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight">
          Find Your Next Meal
        </h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          Browse through the best local restaurants and find your favorite dishes.
        </p>
        <div className="mt-6 max-w-lg mx-auto">
          <Input placeholder="Search restaurants or cuisines..." className="bg-card" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {restaurants.map((restaurant) => (
          <Link href={`/app/restaurant/${restaurant.id}`} key={restaurant.id} className="group">
            <Card className="overflow-hidden h-full transition-shadow duration-300 hover:shadow-lg">
              <CardHeader className="p-0">
                <div className="relative h-40 w-full">
                  <Image
                    src={restaurant.banner.imageUrl}
                    alt={`A promotional image for ${restaurant.name}`}
                    data-ai-hint="restaurant food"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Image
                    src={restaurant.logo.imageUrl}
                    alt={`Logo for ${restaurant.name}`}
                    data-ai-hint={restaurant.logo.imageHint}
                    width={48}
                    height={48}
                    className="rounded-md border-2 border-background shadow-sm -mt-10"
                  />
                  <div className="flex-1">
                    <h2 className="font-headline text-lg font-bold truncate">{restaurant.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-primary fill-primary" />
                        <span>{restaurant.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Utensils className="h-4 w-4" />
                        <span>{restaurant.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
