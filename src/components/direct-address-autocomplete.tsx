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

// Declare Google Maps types since we're loading the script directly
declare global {
  interface Window {
    google: any;
    initAutocomplete: () => void;
  }
}

export default function DirectAddressAutocomplete({ onChange, value }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  
  const [internalValue, setInternalValue] = useState(value || '');

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ No Google Maps API key found');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('✅ Google Maps already loaded');
      initializeServices();
      return;
    }

    console.log('🔄 Loading Google Maps script...');

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initAutocomplete`;
    script.async = true;
    script.defer = true;

    window.initAutocomplete = () => {
      console.log('✅ Google Maps script loaded successfully');
      initializeServices();
    };

    script.onerror = () => {
      console.error('❌ Failed to load Google Maps script');
      toast({
        variant: 'destructive',
        title: 'Maps Error',
        description: 'Failed to load address services'
      });
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (window.initAutocomplete) {
        delete window.initAutocomplete;
      }
      document.head.removeChild(script);
    };
  }, [toast]);

  const initializeServices = () => {
    if (!window.google) {
      console.error('❌ Google object not available');
      return;
    }

    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      geocoderRef.current = new window.google.maps.Geocoder();
      setIsGoogleLoaded(true);
      console.log('✅ Google Maps services initialized');
    } catch (error) {
      console.error('❌ Error initializing Google services:', error);
    }
  };

  // Sync internal state if the external value changes
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Debounced search function
  useEffect(() => {
    if (!isGoogleLoaded || !autocompleteServiceRef.current || !internalValue || internalValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      
      autocompleteServiceRef.current.getPlacePredictions({
        input: internalValue,
        componentRestrictions: { country: 'za' },
        types: ['address']
      }, (predictions: any[], status: string) => {
        setIsLoading(false);
        console.log('📡 Autocomplete response:', { status, predictionsCount: predictions?.length });
        
        if (status === 'OK' && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          if (status !== 'ZERO_RESULTS') {
            console.error('❌ Autocomplete error:', status);
            if (status === 'REQUEST_DENIED') {
              toast({
                variant: 'destructive',
                title: 'API Error',
                description: 'Please check your Google Maps API configuration'
              });
            }
          }
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [internalValue, isGoogleLoaded, toast]);

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

  const handleSelectSuggestion = (placeId: string, description: string) => {
    if (!geocoderRef.current) {
      // Fallback: just use the description
      onChange(description);
      setInternalValue(description);
      setShowSuggestions(false);
      return;
    }

    // Get full address details using Geocoding API
    geocoderRef.current.geocode({ placeId }, (results: any[], status: string) => {
      if (status === 'OK' && results && results[0]) {
        const fullAddress = results[0].formatted_address;
        console.log('📍 Selected address:', fullAddress);
        onChange(fullAddress);
        setInternalValue(fullAddress);
      } else {
        // Fallback to the description
        onChange(description);
        setInternalValue(description);
      }
      setShowSuggestions(false);
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation || !geocoderRef.current) {
      toast({ 
        variant: "destructive", 
        title: "Geolocation not supported", 
        description: "Your browser doesn't support geolocation." 
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        geocoderRef.current.geocode({ location: latlng }, (results: any[], status: string) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            console.log('📍 Current location address:', address);
            onChange(address);
            setInternalValue(address);
            toast({ title: "Location Updated", description: "Your current location has been set." });
          } else {
            toast({ 
              variant: "destructive", 
              title: "Could not find address", 
              description: `Reverse geocoding failed: ${status}` 
            });
          }
        });
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

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={internalValue}
            onChange={handleInputChange}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder={isGoogleLoaded ? "Enter your delivery address..." : "Loading address services..."}
            disabled={!isGoogleLoaded}
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
          disabled={!isGoogleLoaded}
          title={isGoogleLoaded ? "Use current location" : "Loading..."}
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
