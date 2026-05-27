'use client';

import React, { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if this is the first mount of the app session
    const hasSeenSplash = sessionStorage.getItem('pin2you_splash_seen');
    
    if (hasSeenSplash) {
      setShouldRender(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('pin2you_splash_seen', 'true');
      
      // Allow time for fade-out animation
      setTimeout(() => setShouldRender(false), 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
      
      <div className="relative flex flex-col items-center gap-6">
        <div className="bg-primary p-6 rounded-[2.5rem] shadow-2xl shadow-primary/20 animate-splash-logo">
          <Utensils className="h-16 w-16 text-white" strokeWidth={2.5} />
        </div>
        
        <div className="flex flex-col items-center text-center space-y-2 opacity-0 animate-text-reveal [animation-delay:0.3s]">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            Pin<span className="text-primary">2</span>You
          </h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Reliable Local Delivery
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 opacity-0 animate-text-reveal [animation-delay:0.8s]">
        <div className="flex gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0s]" />
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}
