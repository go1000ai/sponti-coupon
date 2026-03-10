import { SquareClient, SquareEnvironment } from 'square';

let _square: SquareClient | null = null;

/**
 * Get the app-level Square client (for OAuth token exchanges).
 * Uses SQUARE_APP_SECRET as the bearer token.
 */
export function getSquare(): SquareClient {
  if (!_square) {
    _square = new SquareClient({
      token: process.env.SQUARE_APP_SECRET!,
      environment: process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });
  }
  return _square;
}

/**
 * Create a Square client authenticated with a specific vendor's access token.
 * Used for creating payment links on the vendor's behalf.
 */
export function getSquareForVendor(accessToken: string): SquareClient {
  return new SquareClient({
    token: accessToken,
    environment: process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
  });
}

// Re-export for convenience
export { SquareClient, SquareEnvironment };
