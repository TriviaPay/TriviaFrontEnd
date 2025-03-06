import { Platform } from 'react-native';

const AUTH0_DOMAIN = 'triviapay.us.auth0.com';
const AUTH0_CLIENT_ID = 'WsK2Z78mO2sBmEF7NmqmNno5cXZypLbk';
const BUNDLE_IDENTIFIER = 'com.trivia.auth0'; 

export const AUTH0_CONFIG = {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
};

const getRedirectUri = () => {
  return Platform.select({
    ios: `${BUNDLE_IDENTIFIER}.auth0://${AUTH0_DOMAIN}/ios/${BUNDLE_IDENTIFIER}/callback`,
    android: `com.trivia://${AUTH0_DOMAIN}/android/com.trivia/callback`
  });
};

const getLogoutUri = () => {
  return Platform.select({
    ios: `${BUNDLE_IDENTIFIER}.auth0://${AUTH0_DOMAIN}/ios/${BUNDLE_IDENTIFIER}/callback`,
    android: `com.trivia://${AUTH0_DOMAIN}/android/com.trivia/callback`
  });
};

export const AUTH0_REDIRECT_URI = getRedirectUri();
export const AUTH0_LOGOUT_URI = getLogoutUri();