import {NextRequest, NextResponse} from 'next/server';

/**
 * API route to proxy requests to the Google Places Autocomplete API.
 * This is necessary to securely use the API key and avoid CORS issues.
 *
 * It expects a GET request with an 'input' query parameter.
 * Example: /api/places?input=123%20Main%20St
 */
export async function GET(request: NextRequest) {
  const {searchParams} = new URL(request.url);
  const input = searchParams.get('input');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {error: 'Google Maps API key is missing'},
      {status: 500}
    );
  }

  if (!input) {
    return NextResponse.json(
      {error: "Missing 'input' query parameter"},
      {status: 400}
    );
  }

  // This is the MODERN Places Autocomplete (New) REST API endpoint.
  const url = 'https://places.googleapis.com/v1/places:autocomplete';

  const requestBody = {
    input: input,
    locationBias: {
      // Bias towards South Africa
      circle: {
        center: {latitude: -29.0, longitude: 24.0},
        radius: 500000.0,
      },
    },
    includedRegionCodes: ['za'],
    languageCode: 'en-US',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Google Places API:', errorData);
      return NextResponse.json(
        {error: 'Failed to fetch from Google Places API', details: errorData},
        {status: response.status}
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Internal error in proxy route:', error);
    return NextResponse.json(
      {error: 'Internal server error', details: error.message},
      {status: 500}
    );
  }
}
