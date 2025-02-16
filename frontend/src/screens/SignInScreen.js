"use client";

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  useWindowDimensions,
  StyleSheet,
  Alert,
} from "react-native";
import { useDispatch } from "react-redux";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import InputField from "../components/InputField";
import Button from "../components/Button";
import {
  setLoading,
  setError,
  setAuthenticated,
} from "../store/authSlice";
import {
  loginWithUsernamePassword,
  loginWithSocial,
  getUserInfo,
} from "../services/auth";

export default function SignInScreen({ navigation }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const { height } = useWindowDimensions();
  const isSmallDevice = height < 700;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const handleLogin = async () => {
  //   if (!email || !password || isSubmitting) {
  //     Alert.alert("Error", "Please fill in all fields");
  //     return;
  //   }
  //   try {
  //     setIsSubmitting(true);
  //     dispatch(setLoading());

  //     // Attempt DB realm login
  //     const { accessToken } = await loginWithUsernamePassword(email, password);
  //     if (!accessToken) {
  //       throw new Error("Login failed: no accessToken");
  //     }

  //     const user = await getUserInfo(accessToken);
  //     dispatch(setAuthenticated(user));
  //     navigation.replace("Home");
  //   } catch (error) {
  //     dispatch(setError(error.message));
  //     Alert.alert("Error", error.message);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleLogin = async () => {
    if (!email || !password || isSubmitting) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      setIsSubmitting(true);
      dispatch(setLoading());

      // 1. Check the credentials via Auth0 DB realm login
      const { accessToken } = await loginWithUsernamePassword(email, password);
      if (!accessToken) {
        throw new Error("Login failed: no accessToken");
      }

      // 2. (Optional) Confirm user is valid, or fetch user info
      //    but do NOT call setAuthenticated yet
      const user = await getUserInfo(accessToken);
      console.log("User info from DB login:", user);

      // 3. Next, send them a one-time code to finish "verifying" this sign-in
      //    We'll define 'sendSignInOTP' in our 'services/auth.js'
      await sendSignInOTP(email);

      // 4. Navigate to "VerifyEmail" with a param indicating it’s for sign-in
      navigation.replace("VerifyEmail", {
        email,
        mode: "SignIn", // so we know later
      });
    } catch (error) {
      dispatch(setError(error.message));
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSocialLogin = async (provider) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      dispatch(setLoading());

      const result = await loginWithSocial(provider);
      if (!result || !result.accessToken) {
        return; // cancelled or error
      }

      const user = await getUserInfo(result.accessToken);
      dispatch(setAuthenticated(user));
      navigation.replace("Home");
    } catch (error) {
      dispatch(setError(error.message));
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require("../../assets/background.png")}
        className="flex-1 w-full h-full"
        resizeMode="cover"
      >
        <View className="absolute top-0 left-0 right-0 bottom-0 w-full h-full backdrop-blur-md bg-black/80" />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={20}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              className={`flex-1 items-center justify-between px-4 ${
                isSmallDevice ? "py-4" : "py-8"
              }`}
            >
              {/* Logo / Title */}
              <View
                className={`flex-row items-center ${
                  isSmallDevice ? "mt-6 mb-4" : "mt-12 mb-8"
                }`}
              >
                <Image
                  source={require("../../assets/trivia.png")}
                  className={`${
                    isSmallDevice ? "w-10 h-10" : "w-14 h-14"
                  } mr-2`}
                />
                <Text
                  className={`text-white ${
                    isSmallDevice ? "text-3xl" : "text-4xl"
                  } font-poppinsRegular`}
                >
                  TriviaPay
                </Text>
              </View>

              <Text
                className={`${
                  isSmallDevice ? "text-4xl" : "text-6xl"
                } text-white font-semibold text-center`}
              >
                Let's Get
              </Text>
              <Text
                className={`${
                  isSmallDevice ? "text-4xl" : "text-6xl"
                } text-primary font-poppinsRegular text-center mb-6`}
              >
                Started!
              </Text>

              <View style={styles.container}>
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
              </View>

              {/* Remember Password */}
              <TouchableOpacity
                className="flex-row items-center mt-1 mb-1 w-[85%]"
                onPress={() => setRememberPassword(!rememberPassword)}
              >
                <View className="h-5 w-5 border-2 border-primary rounded-sm mr-2 items-center justify-center">
                  {rememberPassword && (
                    <View className="h-3 w-3 bg-primary rounded-sm" />
                  )}
                </View>
                <Text className="text-textGray">Remember Password</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <View className="w-[85%]">
                <Button
                  title="SIGN IN"
                  onPress={handleLogin}
                  disabled={isSubmitting}
                />
                <TouchableOpacity className="mt-2 self-start">
                  <Text className="text-primary">Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View className="flex-row items-center my-2 w-[85%]">
                <View className="flex-1 h-[1px] bg-gray-500" />
                <Text className="text-textGray mx-3">or</Text>
                <View className="flex-1 h-[1px] bg-gray-500" />
              </View>

              {/* Social Logins */}
              <View className="w-[85%] space-y-3 gap-2">
                {/* Google */}
                <TouchableOpacity
                  className="flex-row items-center bg-inputBg p-4 rounded-lg"
                  onPress={() => handleSocialLogin("google-oauth2")}
                >
                  <Image
                    source={require("../../assets/google.png")}
                    className="w-6 h-6 mr-3"
                  />
                  <Text className="text-white">Sign In With Google</Text>
                </TouchableOpacity>
                {/* Facebook */}
                <TouchableOpacity
                  className="flex-row items-center bg-inputBg p-4 rounded-lg"
                  onPress={() => handleSocialLogin("facebook")}
                >
                  <Image
                    source={require("../../assets/facebook.png")}
                    className="w-6 h-6 mr-3"
                  />
                  <Text className="text-white">Sign in With Facebook</Text>
                </TouchableOpacity>
                {/* Apple (iOS) or Microsoft (Android) */}
                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    className="flex-row items-center bg-inputBg p-4 rounded-lg"
                    onPress={() => handleSocialLogin("apple")}
                  >
                    <Image
                      source={require("../../assets/apple.png")}
                      className="w-6 h-6 mr-3"
                    />
                    <Text className="text-white">Sign In With Apple</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="flex-row items-center bg-inputBg p-4 rounded-lg"
                    onPress={() => handleSocialLogin("windowslive")}
                  >
                    <Image
                      source={require("../../assets/microsoft.png")}
                      className="w-6 h-6 mr-3"
                    />
                    <Text className="text-white">Sign In With Microsoft</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Another Divider */}
              <View className="flex-row items-center my-6 w-[85%]">
                <View className="flex-1 h-[1px] bg-gray-500" />
              </View>

              {/* Sign Up link */}
              <View className="flex-row items-center justify-center mt-0 mb-4">
                <Text className="text-textGray font-poppinsItalic text-sm">
                  DIDN'T HAVE ACCOUNT?
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                  <Text className="text-primary underline font-poppinsBold text-sm ml-2">
                    SIGN UP NOW
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </TouchableWithoutFeedback>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "85%",
    alignItems: "center",
  },
});
