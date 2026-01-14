'use client';

import React, { useState, useEffect } from 'react';
import { Map, AdvancedMarker, Pin, APIProvider } from '@vis.gl/react-google-maps';
import { useGeocoding } from '@/hooks/use-geocoding';
import type { Order, Restaurant } from '@/lib/data';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type DriverLocation = {
  lat: number;
  lng: number;
}

interface OrderTrackingMapProps {
    order: Order | null;
    restaurant: Restaurant | null;
}

function OrderTrackingMapContent({ order, restaurant }: OrderTrackingMapProps) {
    const firestore = useFirestore();
    const { position: restaurantPosition, isLoading: isRestaurantGeocoding } = useGeocoding(restaurant?.address || null);
    const { position: customerPosition, isLoading: isCustomerGeocoding } = useGeocoding(order?.deliveryAddress || null);

    const driverLocationRef = useMemoFirebase(() => {
        if (!firestore || !order?.driverId) return null;
        return doc(firestore, 'locations', order.driverId);
    }, [firestore, order?.driverId]);

    const { data: driverLocation } = useDoc<DriverLocation>(driverLocationRef);

    const center = driverLocation || restaurantPosition || customerPosition;
    const isLoading = isRestaurantGeocoding || isCustomerGeocoding;

    if (isLoading) {
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
                center={center || { lat: 0, lng: 0 }}
                zoom={13}
                mapId="turf-eats-map"
                disableDefaultUI={true}
            >
                <AdvancedMarker position={restaurantPosition} title={restaurant?.name || 'Restaurant'}>
                    <Pin background={'#A1C181'} glyphColor={'#fff'} borderColor={'#A1C181'} />
                </AdvancedMarker>
                <AdvancedMarker position={customerPosition} title="You">
                     <Pin background={'#1E88E5'} glyphColor={'#fff'} borderColor={'#1E88E5'} />
                </AdvancedMarker>
                {driverLocation && (
                    <AdvancedMarker position={driverLocation} title="Driver">
                        <Pin background={'#FF914D'} glyphColor={'#fff'} borderColor={'#FF914D'} />
                    </AdvancedMarker>
                )}
            </Map>
        </div>
    );
}

export default function OrderTrackingMap(props: OrderTrackingMapProps) {
    return (
        <APIProvider apiKey={API_KEY} version="beta" libraries={['places', 'geocoding']}>
            <OrderTrackingMapContent {...props} />
        </APIProvider>
    )
}

    