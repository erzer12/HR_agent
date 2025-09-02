// In src/lib/google-auth.ts

import { google } from 'googleapis';

// ######################################################################
// # STEP 1: Configure the OAuth2 Client                                #
// ######################################################################
// This client is configured with your app's credentials. It's the
// first step in any interaction with Google's OAuth 2.0 system.

export const oAuth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // This is the "Redirect URI" you configured in the Google Cloud Console.
  // It must be an absolute URL.
  process.env.NODE_ENV === 'production'
    ? 'https://your-production-url.com/api/auth/google/callback' // Replace with your actual production URL
    : 'http://localhost:9002/api/auth/google/callback'
);


// ######################################################################
// # STEP 2: Generate the Authentication URL                            #
// ######################################################################
// This function generates the unique URL that the user will be sent to
// in order to log in with Google and grant your app permissions.

export function getGoogleAuthUrl(): string {
  const scopes = [
    // We are requesting the minimal scope needed to read/write calendar events.
    'https://www.googleapis.com/auth/calendar.events',
    // We also ask for user profile info to personalize the experience.
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' is crucial for getting a refresh token
    prompt: 'consent', // Forces the consent screen to appear, ensuring you get a refresh token
    scope: scopes,
  });
}
