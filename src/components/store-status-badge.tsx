'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { parse, differenceInMinutes, isWithinInterval, set, isBefore } from 'date-fns';

interface StoreStatusBadgeProps {
  openingHours: string;
  className?: string;
}

type Status = 'Open' | 'Closing Soon' | 'Closed';

const parseTime = (timeStr: string): Date | null => {
  try {
    const formattedTime = timeStr.toUpperCase().replace(/\s/g, '');
    return parse(formattedTime, 'h:mma', new Date());
  } catch (e) {
    console.error(`Error parsing time: ${timeStr}`, e);
    return null;
  }
};

const getStoreStatus = (openingHours: string): { status: Status; minutesUntilClose?: number } => {
  if (!openingHours || !openingHours.includes(' - ')) {
    return { status: 'Closed' };
  }

  const [openStr, closeStr] = openingHours.split(' - ');
  if (!openStr || !closeStr) return { status: 'Closed' };

  const now = new Date();
  const openTime = parseTime(openStr);
  let closeTime = parseTime(closeStr);

  if (!openTime || !closeTime) return { status: 'Closed' };

  // Handle overnight hours (e.g., 8:00 PM - 2:00 AM)
  if (isBefore(closeTime, openTime)) {
    // If current time is after open time (e.g. 10 PM), close time is tomorrow
    if (isBefore(openTime, now)) {
      closeTime = set(closeTime, { date: closeTime.getDate() + 1 });
    }
    // If current time is before close time (e.g. 1 AM), open time was yesterday
    else {
      openTime = set(openTime, { date: openTime.getDate() - 1 });
    }
  }

  const isOpen = isWithinInterval(now, { start: openTime, end: closeTime });

  if (isOpen) {
    const minutesUntilClose = differenceInMinutes(closeTime, now);
    if (minutesUntilClose > 0 && minutesUntilClose <= 60) {
      return { status: 'Closing Soon', minutesUntilClose };
    }
    return { status: 'Open' };
  }

  return { status: 'Closed' };
};

export function StoreStatusBadge({ openingHours, className }: StoreStatusBadgeProps) {
  const [statusInfo, setStatusInfo] = useState(() => getStoreStatus(openingHours));
  
  useEffect(() => {
    // Update status every minute
    const interval = setInterval(() => {
      setStatusInfo(getStoreStatus(openingHours));
    }, 60000);

    // Also update when openingHours change
    setStatusInfo(getStoreStatus(openingHours));

    return () => clearInterval(interval);
  }, [openingHours]);

  const { status, minutesUntilClose } = statusInfo;
  
  if (status === 'Open') {
    return <Badge variant="default" className={cn('bg-green-600 hover:bg-green-700 text-white', className)}>Open</Badge>;
  }
  
  if (status === 'Closing Soon') {
    return <Badge variant="destructive" className={cn('bg-yellow-500 text-black hover:bg-yellow-600', className)}>Closes in {minutesUntilClose}m</Badge>;
  }

  return <Badge variant="secondary" className={cn(className)}>Closed</Badge>;
}
