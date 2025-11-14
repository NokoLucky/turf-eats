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
  console.log('[AddressAutocomplete] Component rendered.');
  const { toast } = useToast();
  const places = useMapsLibrary('places');
  const geocoding = useMapsLibrary('geocoding');

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    console.log('[AddressAutocomplete] External value prop changed:', value);
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    console.log('[AddressAutocomplete] Libraries status -> places:', places ? 'Loaded' : 'Not Loaded', 'geocoding:', geocoding ? 'Loaded' : 'Not Loaded');
  }, [places, geocoding]);


  // Debounced search function using the Places API
  useEffect(() => {
    console.log(`[AddressAutocomplete] Search effect triggered. Places lib ready: ${!!places}. Internal value: "${internalValue}"`);
    if (!places || !internalValue || internalValue.length < 3) {
      console.log('[AddressAutocomplete] Search condition not met. Clearing suggestions.');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const autocompleteService = new places.AutocompleteService();
    const timer = setTimeout(() => {
      console.log(`[AddressAutocomplete] Timer fired. Fetching predictions for: "${internalValue}"`);
      setIsLoading(true);
      autocompleteService.getPlacePredictions({
        input: internalValue,
        componentRestrictions: { country: 'za' }, // South Africa
      }, (predictions, status) => {
        setIsLoading(false);
        console.log(`[AddressAutocomplete] API response received with status: ${status}`);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          console.log('[AddressAutocomplete] Predictions received:', predictions);
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          console.log(`[AddressAutocomplete] No predictions or error. Status: ${status}`);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [internalValue, places]);
  
  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            console.log('[AddressAutocomplete] Clicked outside. Hiding suggestions.');
            setShowSuggestions(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  const handleSelectSuggestion = (description: string) => {
    console.log('[AddressAutocomplete] Suggestion selected:', description);
    onChange(description);
    setInternalValue(description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    console.log('[AddressAutocomplete] "Use Current Location" clicked.');
    if (!navigator.geolocation || !geocoding) {
       const message = "Your browser does not support geolocation or the maps library is not ready.";
       console.error(`[AddressAutocomplete] Geolocation error: ${message}`);
       toast({ variant: "destructive", title: "Geolocation not supported", description: message });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[AddressAutocomplete] Geolocation success:', position.coords);
        const geocoder = new geocoding.Geocoder();
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        geocoder.geocode({ location: latlng }, (results, status) => {
          console.log(`[AddressAutocomplete] Reverse geocode status: ${status}`);
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            console.log('[AddressAutocomplete] Reverse geocode success:', address);
            onChange(address);
            setInternalValue(address);
            toast({ title: "Location Updated", description: "Your current location has been set." });
          } else {
            console.error(`[AddressAutocomplete] Reverse geocoding failed: ${status}`);
            toast({ variant: "destructive", title: "Could not find address", description: `Reverse geocoding failed: ${status}` });
          }
        });
      },
      (error) => {
        console.error('[AddressAutocomplete] Error getting location:', error);
        toast({ variant: "destructive", title: "Location Access Denied", description: "Please enable location permissions." });
      }
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`[AddressAutocomplete] Input changed. New value: "${newValue}"`);
    setInternalValue(newValue);
    onChange(newValue); // Propagate change up immediately
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={internalValue || ''}
            onChange={handleInputChange}
            onFocus={() => { 
                console.log('[AddressAutocomplete] Input focused.');
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
          {console.log(`[AddressAutocomplete] Rendering ${suggestions.length} suggestions.`)}
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
