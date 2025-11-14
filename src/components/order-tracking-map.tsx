'use client';

import React, { useState, useEffect } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useGeocoding } from '@/hooks/use-geocoding';
import type { Order, Restaurant } from '@/lib/data';
import { Skeleton } from './ui/skeleton';

// Simple linear interpolation for mock movement
function lerp(start: number, end: number, t: number) {
    return start * (1 - t) + end * t;
}

interface OrderTrackingMapProps {
    order: Order | null;
    restaurant: Restaurant | null;
}

export default function OrderTrackingMap({ order, restaurant }: OrderTrackingMapProps) {
    const { position: restaurantPosition, isLoading: isRestaurantGeocoding } = useGeocoding(restaurant?.address || null);
    const { position: customerPosition, isLoading: isCustomerGeocoding } = useGeocoding(order?.deliveryAddress || null);
    
    const [driverPosition, setDriverPosition] = useState(restaurantPosition);
    const [progress, setProgress] = useState(0);

    // Effect to start driver simulation once both points are geocoded
    useEffect(() => {
        if (restaurantPosition && customerPosition && progress === 0) {
            setDriverPosition(restaurantPosition); // Start driver at the restaurant
            const interval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + 0.01;
                    if (newProgress >= 1) {
                        clearInterval(interval);
                        return 1;
                    }
                    const newLat = lerp(restaurantPosition.lat, customerPosition.lat, newProgress);
                    const newLng = lerp(restaurantPosition.lng, customerPosition.lng, newProgress);
                    setDriverPosition({ lat: newLat, lng: newLng });
                    return newProgress;
                });
            }, 500);

            return () => clearInterval(interval);
        }
    }, [restaurantPosition, customerPosition, progress]);


    if (isRestaurantGeocoding || isCustomerGeocoding) {
        return <Skeleton className="aspect-video w-full" />
    }

    if (!restaurantPosition || !customerPosition) {
         return (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <p>Could not determine location for the addresses provided.</p>
            </div>
        );
    }
    
    return (
        <div className="aspect-video w-full">
            <Map
                defaultCenter={restaurantPosition}
                defaultZoom={13}
                mapId="turf-eats-map"
                disableDefaultUI={true}
            >
                <AdvancedMarker position={restaurantPosition} title={restaurant?.name || 'Restaurant'}>
                    <Pin background={'#A1C181'} glyphColor={'#fff'} borderColor={'#A1C181'} />
                </AdvancedMarker>
                <AdvancedMarker position={customerPosition} title="You">
                     <Pin background={'#1E88E5'} glyphColor={'#fff'} borderColor={'#1E88E5'} />
                </AdvancedMarker>
                {driverPosition && (
                    <AdvancedMarker position={driverPosition} title="Driver">
                        <Pin background={'#FF914D'} glyphColor={'#fff'} borderColor={'#FF914D'} />
                    </AdvancedMarker>
                )}
            </Map>
        </div>
    );
}
