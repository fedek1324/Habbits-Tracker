import { NextRequest, NextResponse } from 'next/server';
import { UserRefreshClient } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const user = new UserRefreshClient(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken
    );

    // Obtain new tokens
    const { credentials } = await user.refreshAccessToken();
    console.log('Refreshed credentials:', credentials);

    return NextResponse.json(credentials);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}