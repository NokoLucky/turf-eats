import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Logo from '@/components/logo';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-landing');
  
  return (
    <div className="relative min-h-screen w-full">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          data-ai-hint={heroImage.imageHint}
          fill
          className="object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="p-4 sm:p-6">
          <Logo className="text-white" />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="max-w-3xl px-4 text-white">
            <h1 className="font-headline text-5xl font-bold tracking-tight md:text-7xl">
              From Local Farms to Your Fork
            </h1>
            <p className="mt-4 text-lg md:text-xl text-neutral-200">
              Discover the best local eats in your small town. Fresh, fast, and friendly delivery right to your doorstep.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="font-bold">
                <Link href="/signup">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="font-bold">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
