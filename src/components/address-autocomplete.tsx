'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
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
  const geocodingApi = useMapsLibrary('geocoding');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal value with the `value` prop from the parent form
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '');
    }
  }, [value]);

  // Debounced search effect
  useEffect(() => {
    if (!internalValue || internalValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Call our local API route instead of Google directly
        const response = await fetch(`/api/places?input=${encodeURIComponent(internalValue)}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Network response was not ok');
        }

        const data = await response.json();
        if (data.predictions) {
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error: any) {
        console.error('Error fetching address suggestions:', error);
        toast({
          variant: 'destructive',
          title: 'Autocomplete Error',
          description: error.message || 'Could not fetch address suggestions.',
        });
      } finally {
        setIsLoading(false);
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
    onChange(description);
    setInternalValue(description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation || !geocodingApi) {
       const message = "Your browser does not support geolocation or the maps library is not ready.";
       toast({ variant: 'destructive', title: 'Geolocation Error', description: message });
       return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geocoder = new geocodingApi.Geocoder();
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            onChange(address);
            setInternalValue(address);
            toast({ title: 'Location Updated', description: 'Your current location has been set.' });
          } else {
            toast({ variant: 'destructive', title: 'Geocoding Error', description: `Could not find address: ${status}` });
          }
        });
      },
      (error) => {
        toast({ variant: 'destructive', title: 'Location Access Denied', description: 'Please enable location permissions in your browser.' });
      }
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
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
            disabled={!geocodingApi}
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
          disabled={!geocodingApi}
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
