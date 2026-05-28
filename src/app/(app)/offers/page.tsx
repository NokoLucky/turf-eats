'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Tag, Zap, Truck, Gift, 
  ArrowRight, Heart, Sparkles, 
  Clock, CheckCircle, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const promoBanners = [
  {
    id: 1,
    title: "Flash Sale Friday!",
    desc: "Get 40% OFF at selected burger joints near you.",
    code: "FLASH40",
    bg: "bg-gradient-to-r from-orange-600 to-red-500",
    icon: <Zap className="h-10 w-10 text-white/50" />
  },
  {
    id: 2,
    title: "Free Delivery",
    desc: "No delivery fee on orders above R200 for 1st time users.",
    code: "FREESHIP",
    bg: "bg-gradient-to-r from-blue-600 to-cyan-500",
    icon: <Truck className="h-10 w-10 text-white/50" />
  }
];

const featuredOffers = [
  {
    id: 1,
    title: "The Golden Spatula",
    offer: "Buy 1 Get 1 Free on Shakes",
    expiry: "2h 45m left",
    category: "Restaurants",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=600&h=400",
    badge: "Limited"
  },
  {
    id: 2,
    title: "QuickMart Groceries",
    offer: "R50 OFF Fresh Produce",
    expiry: "Ends Today",
    category: "Groceries",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600&h=400",
    badge: "Weekly"
  }
];

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Attractive Header */}
      <header className="bg-card px-6 pt-10 pb-8 rounded-b-[2.5rem] shadow-sm border-b border-border/50">
        <div className="flex items-center gap-2 mb-2">
           <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Tag className="h-5 w-5" />
           </div>
           <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Exclusive Deals</span>
        </div>
        <h1 className="text-3xl font-black text-foreground leading-tight">
          Unlock Exclusive <br />
          <span className="text-primary">Savings Today!</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
          The best local deals in your area, updated hourly.
        </p>
      </header>

      <div className="px-4 mt-8 space-y-10">
        {/* Animated Promo Scroller */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">Hot Promos</h2>
              <Link href="#" className="text-xs font-bold text-primary">View Rules</Link>
           </div>
           <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
              {promoBanners.map((promo) => (
                <div 
                  key={promo.id} 
                  className={cn(
                    "min-w-[280px] p-6 rounded-[2rem] text-white relative overflow-hidden shadow-lg",
                    promo.bg
                  )}
                >
                   <div className="absolute -right-4 -top-4">
                      {promo.icon}
                   </div>
                   <h3 className="text-xl font-bold mb-1">{promo.title}</h3>
                   <p className="text-xs text-white/80 mb-6 max-w-[200px]">{promo.desc}</p>
                   <div className="flex items-center justify-between">
                      <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30">
                        <span className="text-[10px] font-black tracking-widest uppercase">{promo.code}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-white font-bold h-auto p-0 hover:bg-transparent">
                        Copy <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* Categories of Savings */}
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-orange-100 dark:bg-orange-950/20 p-4 rounded-3xl flex flex-col gap-3 relative overflow-hidden group active:scale-95 transition-all border border-orange-200 dark:border-orange-900/30">
              <div className="bg-orange-500 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Zap className="h-5 w-5 fill-white" />
              </div>
              <div>
                 <p className="font-black text-orange-900 dark:text-orange-100 leading-tight">Flash <br />Deals</p>
                 <p className="text-[10px] text-orange-700 dark:text-orange-400 font-bold mt-1">Live Now</p>
              </div>
              <Sparkles className="absolute -right-2 -bottom-2 h-16 w-16 text-orange-200/50 dark:text-orange-900/10 group-hover:rotate-12 transition-transform" />
           </div>
           
           <div className="bg-blue-100 dark:bg-blue-950/20 p-4 rounded-3xl flex flex-col gap-3 relative overflow-hidden group active:scale-95 transition-all border border-blue-200 dark:border-blue-900/30">
              <div className="bg-blue-500 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Truck className="h-5 w-5" />
              </div>
              <div>
                 <p className="font-black text-blue-900 dark:text-blue-100 leading-tight">Free <br />Shipping</p>
                 <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold mt-1">12+ Stores</p>
              </div>
              <Gift className="absolute -right-2 -bottom-2 h-16 w-16 text-blue-200/50 dark:text-blue-900/10 group-hover:rotate-12 transition-transform" />
           </div>
        </section>

        {/* Featured Card Offers */}
        <section className="space-y-6">
           <h2 className="font-bold text-lg text-foreground">Specials of the Week</h2>
           <div className="space-y-6">
              {featuredOffers.map((offer) => (
                <Card key={offer.id} className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-card group">
                   <div className="relative h-44 w-full">
                      <Image src={offer.image} alt="offer" fill className="object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute top-4 left-4">
                         <Badge className="bg-white/90 dark:bg-black/60 backdrop-blur-md text-primary border-none font-black text-[10px] px-3 py-1 rounded-full shadow-sm">
                            {offer.badge}
                         </Badge>
                      </div>
                      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-2 text-white">
                         <Clock className="h-3.5 w-3.5 text-orange-400" />
                         <span className="text-[10px] font-bold uppercase tracking-wider">{offer.expiry}</span>
                      </div>
                   </div>
                   <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{offer.category}</p>
                            <h3 className="text-lg font-black text-foreground">{offer.title}</h3>
                         </div>
                         <div className="bg-primary/10 p-2 rounded-xl text-primary">
                            <Heart className="h-5 w-5" />
                         </div>
                      </div>
                      <p className="text-sm font-bold text-primary flex items-center gap-2">
                         <CheckCircle className="h-4 w-4" /> {offer.offer}
                      </p>
                      <Button asChild className="w-full mt-4 rounded-2xl h-12 font-bold shadow-lg shadow-primary/10">
                         <Link href="/dashboard">Claim Offer</Link>
                      </Button>
                   </CardContent>
                </Card>
              ))}
           </div>
        </section>

        {/* Referral Card */}
        <section className="pb-10">
           <div className="bg-slate-900 dark:bg-primary/10 rounded-[2.5rem] p-8 text-white dark:text-foreground relative overflow-hidden border dark:border-primary/20">
              <div className="relative z-10">
                 <Smartphone className="h-10 w-10 text-primary mb-4" />
                 <h2 className="text-2xl font-black mb-2 leading-tight">Refer a friend <br />& get R50!</h2>
                 <p className="text-slate-400 dark:text-muted-foreground text-sm mb-6 max-w-[200px]">Help grow the Pin2You community and get rewarded.</p>
                 <Button className="rounded-xl font-bold bg-white dark:bg-primary text-slate-900 dark:text-primary-foreground hover:bg-slate-100 dark:hover:bg-primary/90">
                    Invite Friends
                 </Button>
              </div>
              <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute right-6 top-10 opacity-20 transform rotate-12 text-primary">
                 <Tag className="h-32 w-32" />
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
