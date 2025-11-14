'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

interface AddressAutocompleteProps {
  onAddressSelect: (address: string) => void;
  defaultValue?: string;
}

export default function AddressAutocomplete({ onAddressSelect, defaultValue }: AddressAutocompleteProps) {
  const places = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [localValue, setLocalValue] = useState(defaultValue || '');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocompleteInstance = new places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['address'],
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      const address = place.formatted_address || '';
      setLocalValue(address);
      onAddressSelect(address);
    });

    setAutocomplete(autocompleteInstance);

  }, [places, onAddressSelect]);
  
  // Update local state if the defaultValue from parent changes
  useEffect(() => {
    setLocalValue(defaultValue || '');
  }, [defaultValue]);

  if (!places) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Input
      ref={inputRef}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder="Start typing your address..."
    />
  );
}
