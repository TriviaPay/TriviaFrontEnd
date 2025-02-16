
import Auth0 from "react-native-auth0";
import { Alert } from "react-native";
import {
  AUTH0_CONFIG,
  AUTH0_REDIRECT_URI,
  AUTH0_LOGOUT_URI,
} from "./auth0-config";

const auth0 = new Auth0(AUTH0_CONFIG);

const handleAuthError = (error, context) => {
  console.error(`${context} error:`, error);
  const message =
    error?.error_description || error?.message || "Authentication failed";
  Alert.alert("Error", message);
  throw new Error(message);
};

export const loginWithSocial = async (connection) => {
  try {
    console.log(`Initiating ${connection} login...`);
    const credentials = await auth0.webAuth.authorize({
      scope: "openid profile email",
      connection,
      redirectUri: AUTH0_REDIRECT_URI,
      audience: `https://${AUTH0_CONFIG.domain}/userinfo`,
      prompt: "login",
    });
    console.log("Social login successful");
    return {
      accessToken: credentials.accessToken,
      idToken: credentials.idToken,
    };
  } catch (error) {
    if (error.message?.includes("cancelled")) {
      console.log("User cancelled login");
      return null;
    }
    handleAuthError(error, "Social login");
  }
};

export const loginWithUsernamePassword = async (email, password) => {
  try {
    console.log("Attempting password realm login...");
    const credentials = await auth0.auth.passwordRealm({
      username: email,
      password,
      realm: "Username-Password-Authentication", 
      scope: "openid profile email",
      audience: `https://${AUTH0_CONFIG.domain}/userinfo`,
    });
    console.log("Password login successful");
    return {
      accessToken: credentials.accessToken,
      idToken: credentials.idToken,
    };
  } catch (error) {
    handleAuthError(error, "Login");
  }
};

export const signupUser = async (email) => {
  try {
    console.log("Requesting email OTP for signup...");

    await auth0.auth.passwordlessWithEmail({
      email,
      send: "code",
    });

    console.log("OTP sent successfully. User must verify.");
    return { success: true, email };
  } catch (error) {
    console.error("Signup OTP error:", error);
    Alert.alert("Error", error.message || "Failed to send OTP");
    throw new Error(error);
  }
};

export const getUserInfo = async (accessToken) => {
  try {
    console.log("Fetching user info...");
    if (!accessToken) {
      throw new Error("Access token is required");
    }
    // Get the user profile
    return await auth0.auth.userInfo({ token: accessToken });
  } catch (error) {
    handleAuthError(error, "Get user info");
  }
};


export const logoutWithAuth0 = async () => {
  try {
    console.log("Initiating logout...");
    await auth0.webAuth.clearSession({
      returnTo: AUTH0_LOGOUT_URI,
    });
    console.log("Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const verifyEmailCode = async (email, otpCode) => {
  try {
    console.log(`Verifying OTP for ${email}...`);

    const credentials = await auth0.auth.loginWithEmail({
      email,
      code: otpCode,
    });

    console.log("OTP verification successful. Logging in...");
    return {
      accessToken: credentials.accessToken,
      idToken: credentials.idToken,
    };
  } catch (error) {
    console.error("OTP Verification Error:", error);
    Alert.alert("Error", error.message || "Invalid OTP. Try again.");
    throw new Error(error);
  }
};

export const resendVerificationCode = async (email) => {
  console.log(`Resending verification code to ${email}...`);
};
