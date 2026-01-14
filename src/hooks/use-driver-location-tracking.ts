'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useDriverLocationTracking(hasActiveDeliveries: boolean) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!hasActiveDeliveries || !user || !firestore) {
      setIsTracking(false);
      return;
    }

    let watchId: number | null = null;

    const startTracking = () => {
      if (!navigator.geolocation) {
        toast({
          variant: 'destructive',
          title: 'Geolocation Not Supported',
          description: 'Your browser does not support location tracking.',
        });
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationRef = doc(firestore, 'locations', user.uid);
          
          const locationData = {
            lat: latitude,
            lng: longitude,
            updatedAt: serverTimestamp(),
          };

          setDocumentNonBlocking(locationRef, locationData, { merge: true });
          setIsTracking(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsTracking(false);
          let description = 'Could not get your location.';
          if (error.code === error.PERMISSION_DENIED) {
            description = 'Please enable location permissions to track your delivery.';
          }
          toast({
            variant: 'destructive',
            title: 'Location Tracking Error',
            description,
          });
          // Stop trying if permission is denied
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [hasActiveDeliveries, user, firestore, toast]);

  return { isTracking };
}

    