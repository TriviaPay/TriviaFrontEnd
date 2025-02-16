// import Auth0 from "react-native-auth0";
// import { Alert } from "react-native";
// import {
//   AUTH0_CONFIG,
//   AUTH0_REDIRECT_URI,
//   AUTH0_LOGOUT_URI,
// } from "./auth0-config";

// const auth0 = new Auth0(AUTH0_CONFIG);

// // Helper function for error handling
// const handleAuthError = (error, context) => {
//   console.error(`${context} error:`, error);
//   const message =
//     error?.error_description || error?.message || "Authentication failed";
//   Alert.alert("Error", message);
//   throw new Error(message);
// };

// export const loginWithSocial = async (connection) => {
//   try {
//     console.log(`Initiating ${connection} login...`)

//     const credentials = await auth0.webAuth.authorize({
//       scope: "openid profile email",
//       connection,
//       redirectUri: AUTH0_REDIRECT_URI,
//       audience: `https://${AUTH0_CONFIG.domain}/userinfo`,
//       prompt: "login",
//     })

//     console.log("Social login successful")
//     return {
//       accessToken: credentials.accessToken,
//       idToken: credentials.idToken,
//     }
//   } catch (error) {
//     if (error.message.includes("cancelled")) {
//       console.log("User cancelled login")
//       return null
//     }
//     handleAuthError(error, "Social login")
//   }
// }


// // Login with Email & Password
// export const loginWithUsernamePassword = async (email, password) => {
//   try {
//     console.log("Attempting password realm login...");

//     const credentials = await auth0.auth.passwordRealm({
//       username: email,
//       password,
//       realm: "Username-Password-Authentication",
//       scope: "openid profile email",
//       audience: `https://${AUTH0_CONFIG.domain}/userinfo`,
//     });

//     console.log("Password login successful");
//     return {
//       accessToken: credentials.accessToken,
//       idToken: credentials.idToken,
//     };
//   } catch (error) {
//     handleAuthError(error, "Login");
//   }
// };

// // User Signup
// export const signupUser = async (email, password, username) => {
//   try {
//     console.log("Creating new user account...");

//     await auth0.auth.createUser({
//       email,
//       password,
//       connection: "Username-Password-Authentication",
//       username,
//       user_metadata: {
//         preferredUsername: username,
//       },
//     });

//     console.log("User created successfully, attempting login...");
//     return await loginWithUsernamePassword(email, password);
//   } catch (error) {
//     handleAuthError(error, "Signup");
//   }
// };

// // Fetch User Info
// export const getUserInfo = async (accessToken) => {
//   try {
//     console.log("Fetching user info...");
//     if (!accessToken) {
//       throw new Error("Access token is required");
//     }
//     return await auth0.auth.userInfo({ token: accessToken });
//   } catch (error) {
//     handleAuthError(error, "Get user info");
//   }
// };

// // Logout Function
// export const logoutWithAuth0 = async () => {
//   try {
//     console.log("Initiating logout...");
//     await auth0.webAuth.clearSession({
//       returnTo: AUTH0_LOGOUT_URI,
//     });
//     console.log("Logout successful");
//   } catch (error) {
//     console.error("Logout error:", error);
//   }
// };
// src/services/auth.js
import Auth0 from "react-native-auth0";
import { Alert } from "react-native";
import {
  AUTH0_CONFIG,
  AUTH0_REDIRECT_URI,
  AUTH0_LOGOUT_URI,
} from "./auth0-config";

const auth0 = new Auth0(AUTH0_CONFIG);

/**
 * Helper: handle errors for consistent error messages
 */
const handleAuthError = (error, context) => {
  console.error(`${context} error:`, error);
  const message =
    error?.error_description || error?.message || "Authentication failed";
  Alert.alert("Error", message);
  throw new Error(message);
};

/**
 * SOCIAL LOGIN
 * e.g. Google, Facebook, Apple, Microsoft
 */
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

/**
 * LOGIN WITH EMAIL/PASSWORD (Auth0 Database)
 */
export const loginWithUsernamePassword = async (email, password) => {
  try {
    console.log("Attempting password realm login...");
    const credentials = await auth0.auth.passwordRealm({
      username: email,
      password,
      realm: "Username-Password-Authentication", // EXACT realm name
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

/**
 * SIGN UP (Auth0 Database)
 * Creates a user in the "Username-Password-Authentication" connection
 * Then logs them in automatically (if successful).
 */
// export const signupUser = async (email, password, username) => {
//   try {
//     console.log("Creating new user account...");

//     // Create the user in your Auth0 Database:
//     await auth0.auth.createUser({
//       email,
//       password,
//       connection: "Username-Password-Authentication",
//       username,
//       user_metadata: {
//         preferredUsername: username,
//       },
//     });

//     console.log("User created successfully. Logging in now...");
//     // Return credentials after automatically logging in:
//     return await loginWithUsernamePassword(email, password);
//   } catch (error) {
//     handleAuthError(error, "Signup");
//   }
// };

export const signupUser = async (email) => {
  try {
    console.log("Requesting email OTP for signup...");

    await auth0.auth.passwordlessWithEmail({
      email,
      send: "code", // Sends a one-time verification code
    });

    console.log("OTP sent successfully. User must verify.");
    return { success: true, email };
  } catch (error) {
    console.error("Signup OTP error:", error);
    Alert.alert("Error", error.message || "Failed to send OTP");
    throw new Error(error);
  }
};

/**
 * FETCH USER INFO from an Access Token
 */
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

/**
 * LOGOUT
 */
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

/**
 * VERIFY EMAIL CODE (placeholder)
 * 
 * If you want a 4-digit code flow, you must have a custom
 * backend or Action in Auth0. Example:
 */
// export const verifyEmailCode = async (email, code) => {
//   console.log(`Verifying code ${code} for email ${email}...`);

//   // 1. Possibly call your own backend or a custom Auth0 Action endpoint
//   //    that checks if the code matches.
//   // 2. If valid, set the user’s "email_verified" to true in Auth0 
//   //    (via Management API).
//   // 3. Return true if successful, or throw Error if not.

//   // Placeholder: always success
//   return true;
// };

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
/**
 * RESEND VERIFICATION CODE (placeholder)
 */
export const resendVerificationCode = async (email) => {
  console.log(`Resending verification code to ${email}...`);
  // Similarly, call your custom endpoint or action that triggers
  // a new 4-digit code email from Auth0. 
  // The default Auth0 database email verification is link-based, 
  // so code-based is custom.

  // Placeholder: success
};
