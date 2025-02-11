"use client";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useDispatch } from "react-redux";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { setLoading, setError, setAuthenticated } from "../store/authSlice";
import { signupUser, getUserInfo } from "../services/auth";

export default function SignUpScreen({ navigation }) {
  const dispatch = useDispatch();
  const [screenHeight, setScreenHeight] = useState(
    Dimensions.get("window").height
  );

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateInputs = () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    console.log("handleSignUp called");
    if (!validateInputs() || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      dispatch(setLoading());
      console.log("Calling signupUser");

      const result = await signupUser(email, password, username);
      console.log("SignupUser result:", result);

      if (result && result.accessToken) {
        const user = await getUserInfo(result.accessToken);
        console.log("User info retrieved:", user);

        dispatch(setAuthenticated(user));
        // after successful signup, route to Home
        navigation.replace("Home");
      } else {
        throw new Error("Signup failed: No access token received");
      }
    } catch (error) {
      console.error("Signup error:", error);
      dispatch(setError(error.message));
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const updateLayout = () => {
      setScreenHeight(Dimensions.get("window").height);
    };
    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={require("../../assets/background.png")}
          className="flex-1 w-full h-full"
          resizeMode="cover"
        >
          {/* Blur Effect */}
          <View className="absolute top-0 left-0 right-0 bottom-0 w-full h-full backdrop-blur-md bg-black/80" />

          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              className="flex-1 px-6 justify-center"
              style={{ minHeight: screenHeight }}
            >
              {/* Back Button */}
              <TouchableOpacity
                className="absolute top-12 left-4"
                onPress={() => navigation.goBack()}
              >
                <Text className="text-white text-2xl">←</Text>
              </TouchableOpacity>

              {/* Heading */}
              <Text className="text-4xl sm:text-5xl text-white font-bold font-poppinsBold mt-10 ml-8 sm:ml-8">
                Create an
              </Text>
              <Text className="text-4xl sm:text-5xl text-primary font-bold font-poppinsBold ml-8 sm:ml-8">
                Account!
              </Text>

              {/* Input Fields */}
              <View className="mt-6 space-y-4 w-[85%] max-w-md mx-auto">
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
                />
                <InputField
                  icon="lock"
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <InputField
                  icon="lock"
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              {/* Sign Up Button */}
              <View className="w-[85%] max-w-md mx-auto mt-4">
                <Button
                  title="SIGN UP"
                  onPress={handleSignUp}
                  disabled={isSubmitting}
                />
              </View>

              {/* Subscription Option */}
              <TouchableOpacity
                className="flex-row items-start mt-4 w-[85%] max-w-md mx-auto"
                onPress={() => setIsChecked(!isChecked)}
                activeOpacity={0.7}
              >
                <View
                  className={`w-5 h-5 border-2 rounded-full mr-3 mt-1 ${
                    isChecked ? "bg-primary border-primary" : "border-primary"
                  }`}
                />

                <Text className="text-textGray font-poppinsRegular text-sm flex-1">
                  Send me occasional emails regarding my account, subscription
                  and special events.
                </Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View className="absolute bottom-8 w-full flex-row justify-center">
                <Text className="text-textGray font-poppinsItalic text-sm">
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("SignIn")}
                >
                  <Text className="text-primary underline font-poppinsBold text-sm">
                    Sign in
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
