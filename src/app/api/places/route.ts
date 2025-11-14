import { NextRequest, NextResponse } from 'next/server';

const PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get('input');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!PLACES_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
  }

  try {
    // Handle Autocomplete request
    if (input) {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${PLACES_API_KEY}&components=country:za&types=address`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error_message) {
        return NextResponse.json({ error: data.error_message, details: data.status }, { status: 400 });
      }
      return NextResponse.json(data);
    }

    // Handle Reverse Geocoding request
    if (lat && lng) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error_message) {
         return NextResponse.json({ error: data.error_message, details: data.status }, { status: 400 });
      }

      if (data.results && data.results[0]) {
        return NextResponse.json({ address: data.results[0].formatted_address });
      } else {
        return NextResponse.json({ error: 'No address found for the coordinates.' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Invalid request. Provide either "input" or "lat" and "lng".' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
