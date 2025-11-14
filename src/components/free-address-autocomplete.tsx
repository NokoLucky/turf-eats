'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddressAutocompleteProps {
  onChange: (address: string) => void;
  value?: string;
}

export default function FreeAddressAutocomplete({ onChange, value }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [internalValue, setInternalValue] = useState(value || '');

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Debounced search using OpenStreetMap Nominatim
  useEffect(() => {
    if (!internalValue || internalValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(internalValue + ', South Africa')}&countrycodes=za&limit=5`
        );
        const data = await response.json();
        console.log('🌍 OpenStreetMap results:', data);
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching from OpenStreetMap:', error);
        toast({
          variant: 'destructive',
          title: 'Search Error',
          description: 'Failed to fetch address suggestions'
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [internalValue, toast]);

  const handleSelectSuggestion = (displayName: string, lat?: string, lon?: string) => {
    onChange(displayName);
    setInternalValue(displayName);
    setShowSuggestions(false);
    console.log('📍 Selected location:', { displayName, lat, lon });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ 
        variant: "destructive", 
        title: "Geolocation not supported", 
        description: "Your browser doesn't support geolocation." 
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            const address = data.display_name;
            onChange(address);
            setInternalValue(address);
            toast({ title: "Location Updated", description: "Your current location has been set." });
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          toast({ 
            variant: "destructive", 
            title: "Could not find address", 
            description: "Failed to get address from your location." 
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({ 
          variant: "destructive", 
          title: "Location Access Denied", 
          description: "Please enable location permissions in your browser." 
        });
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={internalValue}
            onChange={handleInputChange}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="Enter your delivery address..."
            className="pr-10"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleUseCurrentLocation}
          title="Use current location"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelectSuggestion(suggestion.display_name, suggestion.lat, suggestion.lon)}
            >
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  {suggestion.display_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}