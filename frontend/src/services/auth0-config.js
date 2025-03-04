
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
    ios: `${BUNDLE_IDENTIFIER}://${AUTH0_DOMAIN}/ios/${BUNDLE_IDENTIFIER}/callback`,
    android: `${BUNDLE_IDENTIFIER}://${AUTH0_DOMAIN}/android/${BUNDLE_IDENTIFIER}/callback`
  });
};

const getLogoutUri = () => {
  return Platform.select({
    ios: `${BUNDLE_IDENTIFIER}://${AUTH0_DOMAIN}/ios/${BUNDLE_IDENTIFIER}/callback`,
    android: `${BUNDLE_IDENTIFIER}://${AUTH0_DOMAIN}/android/${BUNDLE_IDENTIFIER}/callback`
  });
};

export const AUTH0_REDIRECT_URI = getRedirectUri();
export const AUTH0_LOGOUT_URI = getLogoutUri();