
// "use client";

// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   Image,
//   ImageBackground,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
// } from "react-native";
// import { useNavigation } from "@react-navigation/native";
// import { useDispatch, useSelector } from "react-redux";
// import { signUp } from "../store/authSlice";

// // Our custom components
// import Button from "../components/Button";
// import InputField from "../components/InputField";

// export default function SignupScreen() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const dispatch = useDispatch();
//   const navigation = useNavigation();
//   const { loading, error } = useSelector((state) => state.auth);

//   const handleSignup = async () => {
//     const resultAction = await dispatch(signUp({ email, password }));
//     if (signUp.fulfilled.match(resultAction)) {
//       navigation.navigate("EmailVerification");
//     } else {
//       console.error("Signup error:", resultAction.error);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//       style={{ flex: 1 }}
//     >
//       <ImageBackground
//         source={require("../assets/background.png")}
//         style={{ flex: 1, width: "100%", height: "100%" }}
//         resizeMode="cover"
//       >
//         {/* Semi-transparent overlay */}
//         <View style={{ backgroundColor: "rgba(0,0,0,0.5)", flex: 1, padding: 24 }}>
//           <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
//             <View style={{ backgroundColor: "transparent", padding: 16, borderRadius: 8 }}>
//               {/* Logo */}
//               <Image
//                 source={require("../assets/trivia.png")}
//                 style={{ width: 100, height: 100, alignSelf: "center", marginBottom: 16 }}
//                 resizeMode="contain"
//               />
//               <View style={{ marginBottom: 16, alignItems: "center" }}>
//                 <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
//                   TriviaPay
//                 </Text>
//               </View>

//               <InputField
//                 icon="envelope"
//                 placeholder="Email"
//                 value={email}
//                 onChangeText={setEmail}
//                 secureTextEntry={false}
//               />

//               <InputField
//                 icon="lock"
//                 placeholder="Password"
//                 value={password}
//                 onChangeText={setPassword}
//                 secureTextEntry
//               />

//               <Button title={loading ? "Signing Up..." : "Sign Up"} onPress={handleSignup} />

//               {error && (
//                 <Text style={{ color: "red", marginTop: 8, textAlign: "center" }}>
//                   {error}
//                 </Text>
//               )}

//               <Button
//                 title="Already have an account? Log in"
//                 onPress={() => navigation.navigate("Login")}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </ImageBackground>
//     </KeyboardAvoidingView>
//   );
// }


// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ImageBackground,
//   SafeAreaView,
//   Dimensions,
//   StatusBar,
//   KeyboardAvoidingView,
//   ScrollView,
//   Platform,
//   Alert,
// } from "react-native";
// import { useDispatch, useSelector } from "react-redux";

// // Your custom components
// import InputField from "../components/InputField";
// import Button from "../components/Button";

// // Redux actions
// import { signUp } from "../store/authSlice";

// export default function SignupScreen({ navigation }) {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((state) => state.auth);

//   const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
//   const [username, setUsername] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [isChecked, setIsChecked] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     const updateLayout = () => {
//       setScreenHeight(Dimensions.get("window").height);
//     };
//     const subscription = Dimensions.addEventListener("change", updateLayout);
//     return () => subscription.remove();
//   }, []);

//   const validateInputs = () => {
//     if (!username || !email || !password || !confirmPassword) {
//       Alert.alert("Error", "Please fill in all fields");
//       return false;
//     }
//     if (password !== confirmPassword) {
//       Alert.alert("Error", "Passwords do not match");
//       return false;
//     }
//     if (password.length < 8) {
//       Alert.alert("Error", "Password must be at least 8 characters");
//       return false;
//     }
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       Alert.alert("Error", "Please enter a valid email address");
//       return false;
//     }
//     return true;
//   };

//   const handleSignUp = async () => {
//     if (!validateInputs() || isSubmitting) return;

//     try {
//       setIsSubmitting(true);
//       // Dispatch the Firebase signup action with email and password.
//       // Username can be stored separately if needed.
//       const resultAction = await dispatch(signUp({ email, password }));
//       if (signUp.fulfilled.match(resultAction)) {
//         // On success, navigate to your EmailVerification screen.
//         navigation.navigate("EmailVerification");
//       } else {
//         console.error("Signup error:", resultAction.error);
//         Alert.alert("Error", resultAction.error.message);
//       }
//     } catch (err) {
//       console.error("Signup error:", err);
//       Alert.alert("Error", err.message);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };
//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <StatusBar barStyle="light-content" />

//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//       >
//         {/* Background Image */}
//         <ImageBackground
//           source={require("../assets/background.png")}
//           style={{ flex: 1, width: "100%", height: "100%" }}
//           resizeMode="cover"
//         >
//           {/* Dark overlay */}
//           <View
//             style={{
//               position: "absolute",
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: "rgba(0,0,0,0.8)",
//             }}
//           />

//           <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: "center",
//                 minHeight: screenHeight,
//               }}
//             >
//               {/* Back Button */}
//               <TouchableOpacity
//                 style={{ position: "absolute", top: 40, left: 24 }}
//                 onPress={() => navigation.goBack()}
//               >
//                 <Text style={{ color: "#fff", fontSize: 24 }}>←</Text>
//               </TouchableOpacity>

//               {/* Heading */}
//               <View style={{ marginTop: 60, marginLeft: 32, marginBottom: 24 }}>
//                 <Text style={{ color: "#fff", fontSize: 36, fontWeight: "bold" }}>
//                   Create an
//                 </Text>
//                 <Text style={{ color: "#7b2fff", fontSize: 36, fontWeight: "bold" }}>
//                   Account!
//                 </Text>
//               </View>

//               {/* Input Fields */}
//               <View style={{ marginHorizontal: 32 }}>
//                 <InputField
//                   icon="user"
//                   placeholder="Username"
//                   value={username}
//                   onChangeText={setUsername}
//                 />
//                 <InputField
//                   icon="envelope"
//                   placeholder="Email Address"
//                   value={email}
//                   onChangeText={setEmail}
//                 />
//                 <InputField
//                   icon="lock"
//                   placeholder="Password"
//                   secureTextEntry
//                   value={password}
//                   onChangeText={setPassword}
//                 />
//                 <InputField
//                   icon="lock"
//                   placeholder="Confirm Password"
//                   secureTextEntry
//                   value={confirmPassword}
//                   onChangeText={setConfirmPassword}
//                 />
//               </View>

//               {/* SIGN UP Button */}
//               <View style={{ marginHorizontal: 32, marginTop: 16 }}>
//                 <Button
//                   title={isSubmitting ? "Signing Up..." : "SIGN UP"}
//                   onPress={handleSignUp}
//                   disabled={isSubmitting || loading}
//                 />
//               </View>

//               {/* Checkbox: Send me occasional emails */}
//               <TouchableOpacity
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   marginHorizontal: 32,
//                   marginTop: 16,
//                 }}
//                 onPress={() => setIsChecked(!isChecked)}
//               >
//                 <View
//                   style={{
//                     width: 20,
//                     height: 20,
//                     borderWidth: 2,
//                     borderColor: "#7b2fff",
//                     borderRadius: 4,
//                     marginRight: 8,
//                     backgroundColor: isChecked ? "#7b2fff" : "transparent",
//                   }}
//                 />
//                 <Text style={{ color: "#ccc", fontSize: 14, flex: 1 }}>
//                   Send me occasional emails regarding my account, subscription
//                   and special events.
//                 </Text>
//               </TouchableOpacity>

//               {/* Display any error */}
//               {error ? (
//                 <Text style={{ color: "red", marginTop: 8, textAlign: "center" }}>
//                   {error}
//                 </Text>
//               ) : null}

//               {/* Sign In Link */}
//               <View
//                 style={{
//                   position: "absolute",
//                   bottom: 40,
//                   alignSelf: "center",
//                   flexDirection: "row",
//                 }}
//               >
//                 <Text style={{ color: "#ccc", fontSize: 14 }}>
//                   Already have an account?{" "}
//                 </Text>
//                 <TouchableOpacity onPress={() => navigation.navigate("Login")}>
//                   <Text
//                     style={{
//                       color: "#7b2fff",
//                       textDecorationLine: "underline",
//                       fontWeight: "bold",
//                       fontSize: 14,
//                     }}
//                   >
//                     SIGN IN
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </ScrollView>
//         </ImageBackground>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { signUp } from "../store/authSlice";

export default function SignupScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const updateLayout = () => {
      setScreenHeight(Dimensions.get("window").height);
    };
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription.remove();
  }, []);

  const validateInputs = () => {
    // Trim inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedConfirmPassword = confirmPassword;

    if (!trimmedUsername || !trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }
    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    if (trimmedPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }
    // Validate password conditions
    const passwordErrors = [];
    if (!/[a-z]/.test(trimmedPassword)) {
      passwordErrors.push("At least one lowercase letter");
    }
    if (!/[A-Z]/.test(trimmedPassword)) {
      passwordErrors.push("At least one uppercase letter");
    }
    if (!/[0-9]/.test(trimmedPassword)) {
      passwordErrors.push("At least one number");
    }
    if (!/[!@#$%^&*()_+\-=\{\}\[\]|:;?\/]/.test(trimmedPassword)) {
      passwordErrors.push("At least one special character (! @ # $ % ^ & * ( ) _ + - = { } [ ] | : ; ? /)");
    }
    if (passwordErrors.length > 0) {
      const errorMessage = passwordErrors.map(err => `• ${err}`).join("\n");
      setError(errorMessage);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    // Update email and username with trimmed versions if needed
    setEmail(trimmedEmail);
    setUsername(trimmedUsername);
    return true;
  };

  const handleSignUp = async () => {
    if (!validateInputs() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const resultAction = await dispatch(signUp({ email: email.trim(), password }));
      if (signUp.fulfilled.match(resultAction)) {
        navigation.navigate("EmailVerification");
      } else {
        console.error("Signup error:", resultAction.error);
        Alert.alert("Error", resultAction.error.message);
      }
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Error", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={require("../assets/background.png")}
          style={{ flex: 1, width: "100%", height: "100%" }}
          resizeMode="cover"
        >
          {/* Dark overlay */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
            }}
          />
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ flex: 1, justifyContent: "center", minHeight: screenHeight }}>
              {/* Back Button */}
              <TouchableOpacity
                style={{ position: "absolute", top: 40, left: 24 }}
                onPress={() => navigation.goBack()}
              >
                <Text style={{ color: "#fff", fontSize: 24 }}>←</Text>
              </TouchableOpacity>

              {/* Heading */}
              <View style={{ marginTop: 60, marginLeft: 32, marginBottom: 24 }}>
                <Text style={{ color: "#fff", fontSize: 36, fontWeight: "bold" }}>
                  Create an
                </Text>
                <Text style={{ color: "#7b2fff", fontSize: 36, fontWeight: "bold" }}>
                  Account!
                </Text>
              </View>

              {/* Input Fields */}
              <View style={{ marginHorizontal: 32 }}>
                <InputField
                  icon="user"
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                />
                <InputField
                  icon="envelope"
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <InputField
                  icon="lock"
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <InputField
                  icon="lock"
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
              </View>

              {/* SIGN UP Button */}
              <View style={{ marginHorizontal: 32, marginTop: 16 }}>
                <Button
                  title={isSubmitting ? "Signing Up..." : "SIGN UP"}
                  onPress={handleSignUp}
                  disabled={isSubmitting || loading}
                />
              </View>

              {/* Checkbox */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginHorizontal: 32,
                  marginTop: 16,
                }}
                onPress={() => setIsChecked(!isChecked)}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderWidth: 2,
                    borderColor: "#7b2fff",
                    borderRadius: 4,
                    marginRight: 8,
                    backgroundColor: isChecked ? "#7b2fff" : "transparent",
                  }}
                />
                <Text style={{ color: "#ccc", fontSize: 14, flex: 1 }}>
                  Send me occasional emails regarding my account, subscription and special events.
                </Text>
              </TouchableOpacity>

              {/* Display Errors */}
              {error ? (
                <Text style={{ color: "red", marginTop: 8, textAlign: "center", whiteSpace: "pre-wrap" }}>
                  {error}
                </Text>
              ) : null}

              {/* Sign In Link */}
              <View
                style={{
                  position: "absolute",
                  bottom: 40,
                  alignSelf: "center",
                  flexDirection: "row",
                }}
              >
                <Text style={{ color: "#ccc", fontSize: 14 }}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text
                    style={{
                      color: "#7b2fff",
                      textDecorationLine: "underline",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    SIGN IN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
