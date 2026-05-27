/**
 * This file is a placeholder to satisfy Next.js static export requirements.
 * The application now uses query parameters (e.g., /restaurant?id=...)
 * to handle dynamic store IDs in a static environment.
 */

export function generateStaticParams() {
  // Return at least one dummy parameter to satisfy the static export compiler
  return [{ id: 'static' }];
}

export default function Page() {
  return null;
}
