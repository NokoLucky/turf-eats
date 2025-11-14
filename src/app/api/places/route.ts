import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  const input = searchParams.get('input');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  let url = '';
  let errorMsg = '';

  if (input) {
    // Handle Autocomplete request
    url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${apiKey}&components=country:za`;
    errorMsg = 'Failed to fetch from Google Places Autocomplete API';
  } else if (lat && lng) {
    // Handle Reverse Geocoding request
    url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    errorMsg = 'Failed to fetch from Google Geocoding API';
  } else {
    return NextResponse.json({ error: 'Either "input" or "lat" and "lng" query parameters are required' }, { status: 400 });
  }

  try {
    const apiResponse = await fetch(url);
    const data = await apiResponse.json();

    if (!apiResponse.ok || data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Maps API Error:', data);
      return NextResponse.json({ error: data.error_message || errorMsg, details: data.status }, { status: apiResponse.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
