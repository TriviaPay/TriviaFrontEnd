import { Platform } from "react-native";

const AUTH0_DOMAIN = "dev-82x6ztlibtkrc5bt.us.auth0.com";
const AUTH0_CLIENT_ID = "ronaEEyOSp290k3Wo8CtVN1WZuTh1q26";
const BUNDLE_IDENTIFIER = "com.triviapay.app";
const SCHEME = "triviapay";

export const AUTH0_CONFIG = {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
};

// export const AUTH0_SIGNUP_URI = `https://${AUTH0_DOMAIN}/dbconnections/signup`;

const getRedirectUri = () => {
  const path = Platform.select({
    ios: `ios/${BUNDLE_IDENTIFIER}/callback`,
    android: `android/${BUNDLE_IDENTIFIER}/callback`,
  });
  return `${SCHEME}://${AUTH0_DOMAIN}/${path}`;
};

const getLogoutUri = () => {
  const path = Platform.select({
    ios: `ios/${BUNDLE_IDENTIFIER}/logout`,
    android: `android/${BUNDLE_IDENTIFIER}/logout`,
  });
  return `${SCHEME}://${AUTH0_DOMAIN}/${path}`;
};

export const AUTH0_REDIRECT_URI = getRedirectUri();
export const AUTH0_LOGOUT_URI = getLogoutUri();
