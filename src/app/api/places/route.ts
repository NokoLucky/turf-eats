import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  console.log(`[API/Places] Received request. URL: ${request.url}`);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('[API/Places] Error: API key is not configured');
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  const input = searchParams.get('input');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  let url = '';
  let errorMsg = '';
  let apiType = '';

  if (input) {
    apiType = 'Autocomplete';
    url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${apiKey}&components=country:za`;
    errorMsg = 'Failed to fetch from Google Places Autocomplete API';
  } else if (lat && lng) {
    apiType = 'Reverse Geocoding';
    url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    errorMsg = 'Failed to fetch from Google Geocoding API';
  } else {
    console.warn('[API/Places] Bad request: Missing required query parameters.');
    return NextResponse.json({ error: 'Either "input" or "lat" and "lng" query parameters are required' }, { status: 400 });
  }

  console.log(`[API/Places] Calling Google Maps ${apiType} API. URL: ${url}`);
  try {
    const apiResponse = await fetch(url);
    const data = await apiResponse.json();

    console.log(`[API/Places] Received response from Google. Status: ${apiResponse.status}, Body:`, data);

    if (!apiResponse.ok || data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[API/Places] Google Maps API Error (${apiType}):`, data);
      return NextResponse.json({ error: data.error_message || errorMsg, details: data.status }, { status: apiResponse.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API/Places] Internal Server Error during ${apiType} fetch:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
