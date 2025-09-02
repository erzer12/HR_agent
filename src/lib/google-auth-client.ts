// In src/lib/google-auth-client.ts

import { google } from 'googleapis';

// ######################################################################
// # STEP 1: Configure the OAuth2 Client                                #
// ######################################################################
// This client is configured with your app's credentials. It's the
// first step in any interaction with Google's OAuth 2.0 system.

export const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // This is the "Redirect URI" you configured in the Google Cloud Console.
  // It must be an absolute URL and match the value in your .env file.
  process.env.GOOGLE_REDIRECT_URI
);
