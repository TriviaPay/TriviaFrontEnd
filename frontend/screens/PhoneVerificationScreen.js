
import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";

import InputField from "../components/InputField";
import Button from "../components/Button";

export default function PhoneNumberScreen({ navigation }) {
  const [countryCode, setCountryCode] = useState("+1");
  const [localNumber, setLocalNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    const phoneNumber = `${countryCode}${localNumber}`.trim();
    if (!phoneNumber || !phoneNumber.startsWith("+")) {
      setError("Please enter a valid phone number in E.164 format.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const confirmationResult = await signInWithPhoneNumber(authInstance, phoneNumber);

      // Navigate to the OTP screen, passing the confirmation object and phoneNumber
      navigation.navigate("OtpVerification", {
        confirmation: confirmationResult,
        phoneNumber: phoneNumber,
      });
    } catch (err) {
      console.error("Error sending code:", err);
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      className="flex-1 bg-gray-100"
    >
      <ImageBackground
        source={require("../assets/background.png")}
        style={{ flex: 1, width: "100%", height: "100%" }}
        resizeMode="cover"
      >
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        >
          <View className="p-4 rounded-lg">
            <Text className="text-2xl font-semibold mb-6 text-center text-white">
              Verification
            </Text>
            <Text className="text-center text-white mb-8">
              We will send you a One Time Password (OTP) on your phone number
            </Text>

            {/* Country code + local number  */}
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              {/* Country code  */}
              <View style={{ flex: 0.4 }}>
                <InputField
                  icon="phone"
                  placeholder="+1"
                  value={countryCode}
                  onChangeText={setCountryCode}
                />
              </View>
              {/* Local number  */}
              <View style={{ flex: 0.6, marginLeft: 8 }}>
                <InputField
                  icon="phone"
                  placeholder="5551234567"
                  value={localNumber}
                  onChangeText={setLocalNumber}
                />
              </View>
            </View>

            <Button
              title={loading ? "Sending..." : "GET OTP"}
              onPress={handleSendCode}
            />

            {error ? (
              <Text className="text-red-500 mt-4 text-center">{error}</Text>
            ) : null}
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
