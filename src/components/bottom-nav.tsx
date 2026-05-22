'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Tag, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/offers', label: 'Offers', icon: Tag },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide the bottom navigation on transactional screens where it conflicts with action buttons
  const hideNavPaths = ['/cart', '/checkout', '/order-success'];
  const shouldHide = hideNavPaths.some(path => pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)] border-t md:hidden">
      <nav className="container flex h-20 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1.5 transition-all px-4 py-2 rounded-2xl',
                isActive ? 'text-primary' : 'text-slate-400'
              )}
            >
              <item.icon className={cn('h-6 w-6', isActive && 'fill-primary/10')} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn('text-[11px] font-bold', isActive ? 'text-primary' : 'text-slate-400')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
