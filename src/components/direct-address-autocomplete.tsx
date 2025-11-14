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

interface Suggestion {
  placePrediction: {
    placeId: string;
    text: {
      text: string;
      matches: any[];
    };
    structuredFormat: {
      mainText: { text: string };
      secondaryText?: { text: string };
    };
  };
}


export default function DirectAddressAutocomplete({ onChange, value }: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [internalValue, setInternalValue] = useState(value || '');

  // Sync internal state if the external value changes
  useEffect(() => {
    setInternalValue(value || '');
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
        const response = await fetch(`/api/places?input=${encodeURIComponent(internalValue)}`);
        const data = await response.json();
        
        if (response.ok) {
          setSuggestions(data.suggestions || []);
        } else {
          console.error("Error from proxy:", data.error);
          setSuggestions([]);
        }
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        toast({
          variant: 'destructive',
          title: 'Autocomplete Error',
          description: 'Could not fetch address suggestions.'
        })
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const fullAddress = suggestion.placePrediction.text.text;
    onChange(fullAddress);
    setInternalValue(fullAddress);
    setShowSuggestions(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };
  
  const handleUseCurrentLocation = () => {
    toast({
        variant: 'destructive',
        title: 'Feature Coming Soon',
        description: 'Using your current location is not yet supported.'
    })
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
              key={suggestion.placePrediction.placeId}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{suggestion.placePrediction.structuredFormat.mainText.text}</div>
                  {suggestion.placePrediction.structuredFormat.secondaryText && (
                    <div className="text-xs text-muted-foreground">
                      {suggestion.placePrediction.structuredFormat.secondaryText.text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
