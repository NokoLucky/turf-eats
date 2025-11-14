'use client';

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

interface AddressAutocompleteProps {
  onChange: (address: string) => void;
  value?: string;
}

export default function AddressAutocomplete({ onChange, value }: AddressAutocompleteProps) {
  const places = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocompleteInstance = new places.Autocomplete(inputRef.current, {
      fields: ['formatted_address'],
      types: ['address'],
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      const address = place.formatted_address || '';
      onChange(address);
    });

  }, [places, onChange]);
  
  if (!places) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start typing your address..."
    />
  );
}
