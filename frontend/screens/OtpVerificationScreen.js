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

export default function OtpVerificationScreen({ route, navigation }) {
const { confirmation, phoneNumber } = route.params || {};
const [otpCode, setOtpCode] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [currentConfirmation, setCurrentConfirmation] = useState(confirmation);

const handleVerify = async () => {
if (!currentConfirmation) {
    setError("No verification code has been sent. Please go back and try again.");
    return;
}
if (!otpCode.trim()) {
    setError("Please enter the verification code.");
    return;
}
setLoading(true);
setError("");
try {
    await currentConfirmation.confirm(otpCode.trim());
    console.log("Phone verified successfully!");
    navigation.navigate("Home");
} catch (err) {
    console.error("Error verifying code:", err);
    setError(err.message);
}
setLoading(false);
};

const handleResend = async () => {
if (!phoneNumber) {
    setError("No phone number found. Please go back and re-enter.");
    return;
}
setLoading(true);
setError("");
try {
    const app = getApp();
    const authInstance = getAuth(app);
    const newConfirmation = await signInWithPhoneNumber(authInstance, phoneNumber);
    setCurrentConfirmation(newConfirmation);
    setError("");
    console.log("OTP re-sent successfully!");
} catch (err) {
    console.error("Error re-sending code:", err);
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
            We have sent an OTP via SMS to {phoneNumber}
        </Text>

        <InputField
            icon="lock"
            placeholder="Enter OTP"
            value={otpCode}
            onChangeText={setOtpCode}
        />

        <Button
            title={loading ? "Verifying..." : "VERIFY"}
            onPress={handleVerify}
        />

        <Button
            title={loading ? "Resending..." : "RESEND"}
            onPress={handleResend}
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
