"use client";

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

import Button from "../components/Button";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage("Password reset email sent!");
    } catch (error) {
      setInfoMessage(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ImageBackground
        source={require("../assets/background.png")}
        resizeMode="cover"
        style={{ flex: 1, width: "100%", height: "100%" }}
      >
        <View className="bg-black/70 flex-1 p-6 justify-center">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-transparent p-4 rounded-2xl">
              <Text className="text-white text-2xl font-bold text-center mb-6">
                Forgot Password
              </Text>

              <TextInput
                className="bg-[#333] px-4 py-3 rounded-2xl text-white mb-4"
                placeholder="Enter your email"
                placeholderTextColor="#ccc"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />

              <Button title="Send Password Reset" onPress={handlePasswordReset} />

              {infoMessage ? (
                <Text className="text-white mt-4 text-center">{infoMessage}</Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
