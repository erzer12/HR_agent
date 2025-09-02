
// In src/app/api/auth/google/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { oAuth2Client } from '@/lib/google-auth-client';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  // Log the full callback URL to help diagnose redirect_uri_mismatch errors
  console.log('Received Google OAuth callback at URL:', req.url);

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=NoCode', req.nextUrl.origin)
    );
  }

  try {
    // ######################################################################
    // # STEP 3: Exchange the authorization code for tokens                 #
    // ######################################################################
    // This is where you would exchange the code for an access token and a
    // refresh token. The `google-auth-library` helps with this.

    const { tokens } = await oAuth2Client.getToken(code);

    // ######################################################################
    // # STEP 4: Securely Store the Tokens                                  #
    // ######################################################################
    // The `tokens` object contains `access_token`, `refresh_token`, etc.
    //
    // THIS IS THE MOST CRITICAL STEP FOR A DEVELOPER TO IMPLEMENT.
    //
    // You MUST store these tokens securely, associating them with the
    // currently logged-in user. A secure, server-side database like
    // Firestore is the recommended place.
    //
    // - Encrypt the tokens before storing them.
    // - Associate them with a user ID.
    //
    // Example (pseudo-code for Firestore):
    // const userId = await getUserIdFromSession(req); // Get user ID
    // const encryptedTokens = encrypt(tokens); // Encrypt tokens
    // await db.collection('users').doc(userId).update({
    //   googleTokens: encryptedTokens
    // });
    
    // For this placeholder, we will just log them to the server console.
    // DO NOT do this in production.
    console.log('--- GOOGLE OAUTH TOKENS (Placeholder) ---');
    console.log('Received tokens. In a real app, these must be stored securely.');
    console.log(tokens);
    console.log('--- END OF PLACEHOLDER ---');


    // For the purpose of this demo, we'll set a simple cookie to simulate
    // a connected state. A real app would use a proper session.
    cookies().set('google_calendar_connected', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    
    // Redirect the user back to the main page with a success query param
    return NextResponse.redirect(
      new URL('/?calendar=connected', req.nextUrl.origin)
    );

  } catch (error) {
    console.error("Error exchanging auth code for tokens:", error);
    return NextResponse.redirect(
        new URL('/?error=TokenExchangeFailed', req.nextUrl.origin)
    );
  }
}
