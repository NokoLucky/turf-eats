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
  const [internalValue, setInternalValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal value with the `value` prop from the parent form
  useEffect(() => {
    console.log('[Autocomplete] Syncing internal state with prop value:', value);
    if (value !== internalValue) {
      setInternalValue(value || '');
    }
  }, [value]);

  // Debounced search effect
  useEffect(() => {
    console.log(`[Autocomplete] Search effect triggered. Internal value: "${internalValue}"`);

    if (!internalValue || internalValue.length < 3) {
      console.log('[Autocomplete] Value too short. Clearing suggestions.');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      console.log(`[Autocomplete] Debounce timer fired. Fetching for: "${internalValue}"`);
      setIsLoading(true);
      const url = `/api/places?input=${encodeURIComponent(internalValue)}`;
      console.log(`[Autocomplete] Fetching URL: ${url}`);
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('[Autocomplete] Received data from proxy:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Network response was not ok');
        }

        if (data.predictions) {
          console.log(`[Autocomplete] Setting ${data.predictions.length} suggestions.`);
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        } else {
          console.log('[Autocomplete] No predictions in response. Clearing suggestions.');
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error: any) {
        console.error('[Autocomplete] Error fetching address suggestions:', error);
        toast({
          variant: 'destructive',
          title: 'Autocomplete Error',
          description: error.message || 'Could not fetch address suggestions.',
        });
      } finally {
        setIsLoading(false);
        console.log('[Autocomplete] Finished fetching.');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [internalValue, toast]);
  
  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectSuggestion = (description: string) => {
    console.log(`[Autocomplete] Suggestion selected: "${description}"`);
    onChange(description);
    setInternalValue(description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
     console.log('[Autocomplete] "Use Current Location" clicked.');
    if (!navigator.geolocation) {
       const message = "Your browser does not support geolocation.";
       console.error(`[Autocomplete] Geolocation error: ${message}`);
       toast({ variant: 'destructive', title: 'Geolocation Error', description: message });
       return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log(`[Autocomplete] Geolocation success. Lat: ${latitude}, Lng: ${longitude}`);
          const response = await fetch(`/api/places?lat=${latitude}&lng=${longitude}`);
           console.log('[Autocomplete] Geocoding proxy response:', response);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to geocode location.');
          }
          const data = await response.json();
          console.log('[Autocomplete] Geocoding proxy data:', data);
          if (data.results && data.results[0]) {
            const address = data.results[0].formatted_address;
            console.log(`[Autocomplete] Geocoded address: "${address}"`);
            onChange(address);
            setInternalValue(address);
            toast({ title: 'Location Updated', description: 'Your current location has been set.' });
          } else {
             throw new Error(data.details || 'Could not find address for your location.');
          }
        } catch (error: any) {
           console.error('[Autocomplete] Geocoding fetch error:', error);
          toast({ variant: 'destructive', title: 'Geocoding Error', description: error.message });
        }
      },
      (error) => {
        console.error('[Autocomplete] Geolocation permission denied:', error);
        toast({ variant: 'destructive', title: 'Location Access Denied', description: 'Please enable location permissions in your browser.' });
      }
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`[Autocomplete] Input changed. New value: "${newValue}"`);
    setInternalValue(newValue);
    onChange(newValue); // Keep the form state in sync as the user types
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={internalValue}
            onChange={handleInputChange}
            onFocus={() => { 
              if (suggestions.length > 0) setShowSuggestions(true); 
            }}
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
              onClick={() => handleSelectSuggestion(suggestion.description)}
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
