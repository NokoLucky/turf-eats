'use client';

import { useState, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

type GeocodingResult = {
    lat: number;
    lng: number;
} | null;

export function useGeocoding(address: string | null) {
    const geocodingApi = useMapsLibrary('geocoding');
    const [position, setPosition] = useState<GeocodingResult>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!geocodingApi || !address) {
            setPosition(null);
            return;
        }

        const geocoder = new geocodingApi.Geocoder();
        setIsLoading(true);

        geocoder.geocode({ address }, (results, status) => {
            setIsLoading(false);
            if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                setPosition({ lat: location.lat(), lng: location.lng() });
            } else {
                console.error(`Geocode was not successful for the following reason: ${status}`);
                setPosition(null);
            }
        });

    }, [geocodingApi, address]);

    return { position, isLoading };
}
