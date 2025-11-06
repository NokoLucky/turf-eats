'use client';

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const restaurantPosition = { lat: 34.0522, lng: -118.2437 }; // Downtown LA
const customerPosition = { lat: 34.0622, lng: -118.2537 }; // A bit north

// Simple linear interpolation for mock movement
function lerp(start: number, end: number, t: number) {
    return start * (1 - t) + end * t;
}

export default function OrderTrackingMap() {
    const [driverPosition, setDriverPosition] = useState(restaurantPosition);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (progress >= 1) return;

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
    }, [progress]);

    if (!API_KEY) {
        return (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <p>Google Maps API key is missing.</p>
            </div>
        );
    }
    
    return (
        <APIProvider apiKey={API_KEY}>
            <div className="aspect-video w-full">
                <Map
                    defaultCenter={restaurantPosition}
                    defaultZoom={13}
                    mapId="turf-eats-map"
                    disableDefaultUI={true}
                >
                    <AdvancedMarker position={restaurantPosition} title="Restaurant">
                        <Pin background={'#A1C181'} glyphColor={'#fff'} borderColor={'#A1C181'} />
                    </AdvancedMarker>
                    <AdvancedMarker position={customerPosition} title="You">
                         <Pin background={'#1E88E5'} glyphColor={'#fff'} borderColor={'#1E88E5'} />
                    </AdvancedMarker>
                    <AdvancedMarker position={driverPosition} title="Driver">
                         <Pin background={'#FF914D'} glyphColor={'#fff'} borderColor={'#FF914D'} />
                    </AdvancedMarker>
                </Map>
            </div>
        </APIProvider>
    );
}
