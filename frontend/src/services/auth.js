import Auth0 from "react-native-auth0";
import { Alert } from "react-native";
import {
  AUTH0_CONFIG,
  AUTH0_REDIRECT_URI,
  AUTH0_LOGOUT_URI,
} from "./auth0-config";

const auth0 = new Auth0(AUTH0_CONFIG);

// Helper function for error handling
const handleAuthError = (error, context) => {
  console.error(`${context} error:`, error);
  const message =
    error?.error_description || error?.message || "Authentication failed";
  Alert.alert("Error", message);
  throw new Error(message);
};

export const loginWithSocial = async (connection) => {
  try {
    console.log(`Initiating ${connection} login...`)

    const credentials = await auth0.webAuth.authorize({
      scope: "openid profile email",
      connection,
      redirectUri: AUTH0_REDIRECT_URI,
      audience: `https://${AUTH0_CONFIG.domain}/userinfo`,
      prompt: "login",
    })

    console.log("Social login successful")
    return {
      accessToken: credentials.accessToken,
      idToken: credentials.idToken,
    }
  } catch (error) {
    if (error.message.includes("cancelled")) {
      console.log("User cancelled login")
      return null
    }
    handleAuthError(error, "Social login")
  }
}


// Login with Email & Password
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

// User Signup
export const signupUser = async (email, password, username) => {
  try {
    console.log("Creating new user account...");

    await auth0.auth.createUser({
      email,
      password,
      connection: "Username-Password-Authentication",
      username,
      user_metadata: {
        preferredUsername: username,
      },
    });

    console.log("User created successfully, attempting login...");
    return await loginWithUsernamePassword(email, password);
  } catch (error) {
    handleAuthError(error, "Signup");
  }
};

// Fetch User Info
export const getUserInfo = async (accessToken) => {
  try {
    console.log("Fetching user info...");
    if (!accessToken) {
      throw new Error("Access token is required");
    }
    return await auth0.auth.userInfo({ token: accessToken });
  } catch (error) {
    handleAuthError(error, "Get user info");
  }
};

// Logout Function
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
