'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WhatsAppFAB() {
  const handleSupport = () => {
    // Replace with actual support number
    window.open('https://wa.me/27123456789', '_blank');
  };

  return (
    <Button
      onClick={handleSupport}
      className="fixed bottom-24 right-6 md:bottom-10 md:right-10 h-14 w-14 rounded-full shadow-2xl z-50 bg-[#25D366] hover:bg-[#128C7E] border-none text-white p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      aria-label="Need Help? Chat on WhatsApp"
    >
      <div className="relative">
        <MessageSquare className="h-7 w-7 fill-white" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </div>
    </Button>
  );
}