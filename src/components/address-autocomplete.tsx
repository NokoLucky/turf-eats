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

export default function AddressAutocomplete({ onChange, value }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal state if the external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced search function
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
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(internalValue)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&components=country:za`
        );
        const data = await response.json();
        setSuggestions(data.predictions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [internalValue]);
  
  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&fields=formatted_address`
      );
      const data = await response.json();
      
      const fullAddress = data.result?.formatted_address || description;
      onChange(fullAddress);
      setInternalValue(fullAddress); // update internal state as well
      setShowSuggestions(false);
      setSuggestions([]);
    } catch (error) {
      console.error('Error fetching place details:', error);
      onChange(description); // fallback to description
      setInternalValue(description);
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            if (data.results && data.results[0]) {
              const address = data.results[0].formatted_address;
              onChange(address);
              setInternalValue(address);
              toast({ title: "Location Updated", description: "Your current location has been set as the address." });
            } else {
               toast({ variant: "destructive", title: "Could not find address", description: "Reverse geocoding failed." });
            }
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch address details." });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({ variant: "destructive", title: "Location Access Denied", description: "Please enable location permissions in your browser." });
        }
      );
    } else {
        toast({ variant: "destructive", title: "Geolocation not supported", description: "Your browser does not support geolocation." });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    onChange(e.target.value);
  }

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
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
            >
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{suggestion.structured_formatting?.main_text}</div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.structured_formatting?.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
