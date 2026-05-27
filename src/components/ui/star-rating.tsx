
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  count?: number;
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  className?: string;
}

export function StarRating({
  count = 5,
  value,
  onChange,
  size = 24,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);
  const stars = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stars.map((starValue) => (
        <Star
          key={starValue}
          className={cn(
            'cursor-pointer transition-colors',
            (hoverValue || value) >= starValue
              ? 'text-primary fill-primary'
              : 'text-muted-foreground'
          )}
          style={{ width: size, height: size }}
          onClick={() => onChange(starValue)}
          onMouseEnter={() => setHoverValue(starValue)}
          onMouseLeave={() => setHoverValue(undefined)}
        />
      ))}
    </div>
  );
}
