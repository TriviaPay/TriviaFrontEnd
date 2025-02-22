"use client";

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  useWindowDimensions,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useDispatch } from "react-redux";
import { login } from "../store/authSlice";

import InputField from "../components/InputField";
import Button from "../components/Button";

export default function SignInScreen({ navigation }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { height } = useWindowDimensions();
  const isSmallDevice = height < 700;

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const resultAction = await dispatch(login({ email: trimmedEmail, password }));
      if (login.fulfilled.match(resultAction)) {
        navigation.replace("Home");
      } else {
        Alert.alert("Error", resultAction.error.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Implement your reset password flow here.");
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/background.png")}
        className="flex-1 w-full h-full"
        resizeMode="cover"
      >
        {/* Dark blur overlay */}
        <View className="absolute top-0 left-0 right-0 bottom-0 w-full h-full backdrop-blur-md bg-black/80" />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
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
                  source={require("../assets/trivia.png")}
                  className={`${isSmallDevice ? "w-10 h-10" : "w-14 h-14"} mr-2`}
                />
                <Text
                  className={`text-white ${
                    isSmallDevice ? "text-3xl" : "text-4xl"
                  } font-poppinsRegular`}
                >
                  TriviaPay
                </Text>
              </View>

              {/* Headline */}
              <Text
                className={`${isSmallDevice ? "text-4xl" : "text-6xl"} text-white font-semibold text-center`}
              >
                Let's Get
              </Text>
              <Text
                className={`${isSmallDevice ? "text-4xl" : "text-6xl"} text-[#7b2fff] font-poppinsRegular text-center mb-6`}
              >
                Started!
              </Text>

              {/* Input Fields */}
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

              <TouchableOpacity
                className="flex-row items-center w-[85%]"
                onPress={() => setRememberPassword(!rememberPassword)}
              >
                <View className="h-5 w-5 border-2 border-[#7b2fff] rounded-sm mr-2 items-center justify-center">
                  {rememberPassword && (
                    <View className="h-3 w-3 bg-[#7b2fff] rounded-sm" />
                  )}
                </View>
                <Text className="text-white">Remember Password</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <View className="w-[85%]">
                <Button
                  title={isSubmitting ? "Signing In..." : "SIGN IN"}
                  onPress={handleSignIn}
                  disabled={isSubmitting}
                />
                <TouchableOpacity className="mt-2 self-start" onPress={handleForgotPassword}>
                  <Text className="text-white">Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Optional Divider */}
              <View className="flex-row items-center mt-8 mb-2 w-[85%]">
                <View className="flex-1 h-[1px] bg-gray-500" />
              </View>

              {/* Sign Up link */}
              <View className="flex-row items-center justify-center mt-0 mb-0">
                <Text className="text-white font-poppinsItalic text-sm">
                  DIDN'T HAVE ACCOUNT?
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                  <Text className="text-[#7b2fff] underline font-poppinsBold text-sm ml-2">
                    SIGN UP NOW
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
