
'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useDriverLocationTracking(isActive: boolean) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Only track if active (online) and we have the necessary context
    if (!isActive || !user || !firestore) {
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

      // Request current position immediately to verify permission
      navigator.geolocation.getCurrentPosition(
        () => {}, 
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            toast({
              variant: 'destructive',
              title: 'Location Permission Denied',
              description: 'Please enable location permissions to go online and accept deliveries.',
            });
          }
        }
      );

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
          
          if (error.code === error.PERMISSION_DENIED) {
            // Already handled above, but ensure tracking is off
          } else {
             toast({
              variant: 'destructive',
              title: 'Tracking Error',
              description: 'Lost connection to GPS.',
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
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
  }, [isActive, user, firestore, toast]);

  return { isTracking };
}
