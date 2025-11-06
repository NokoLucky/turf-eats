import type { HTMLAttributes } from 'react';
import Link from 'next/link';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoProps = HTMLAttributes<HTMLDivElement>;

export default function Logo({ className, ...props }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Turf Eats Home">
      <div className={cn("flex items-center gap-2 text-primary", className)} {...props}>
        <Utensils className="h-6 w-6" />
        <span className="font-headline text-2xl font-bold">
          Turf Eats
        </span>
      </div>
    </Link>
  );
}
