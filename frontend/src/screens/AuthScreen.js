"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
  Keyboard,
} from "react-native"
import LinearGradient from "react-native-linear-gradient"
import LottieView from "lottie-react-native"
import { useNavigation } from "@react-navigation/native"
import { useDispatch, useSelector } from "react-redux"
import { sendVerificationEmail, verifyOTP } from "../store/authSlice"

const { width, height } = Dimensions.get("window")

const AuthScreen = () => {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const { isLoading, error, emailVerificationSent, isAuthenticated } = useSelector((state) => state.auth)
  const [inputRef, setInputRef] = useState(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace("Home")
    }
  }, [isAuthenticated, navigation])

  // Clean email by removing spaces 
  const cleanEmail = (email) => {
    return email.trim().replace(/\s+/g, "")
  }

  const handleAuthAction = async () => {
    if (!emailVerificationSent) {
      const cleanedEmail = cleanEmail(email)
      if (cleanedEmail) {
        await dispatch(sendVerificationEmail(cleanedEmail))
      }
    } else {
      await dispatch(verifyOTP({ email: cleanEmail(email), code: otp }))
    }
  }

  // Handle submit
  const handleSubmit = () => {
    Keyboard.dismiss()
    handleAuthAction()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#DDD1EB" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDD1EB" />

      {/* Background Animation */}
      <LottieView
        source={require("../../assets/lottie/tree.json")}
        autoPlay
        loop
        style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.5 }}
      />

      {/* Logo in top right corner */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: 16,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../assets/trivia.png")}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              resizeMode: "contain",
            }}
          />
          <Text
            style={{
              color: "black",
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 4,
            }}
          >
            TriviaPay
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            width: width > 500 ? "80%" : "90%",
            maxWidth: 400,
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            borderRadius: 16,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            opacity: 0.9,
          }}
        >
          <Text
            style={{
              color: "black",
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            {emailVerificationSent ? "Verify OTP" : "Sign in to your account"}
          </Text>

          {error && (
            <Text
              style={{
                color: "red",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          )}

          {!emailVerificationSent ? (
            <TextInput
              ref={(ref) => setInputRef(ref)}
              style={{
                width: "100%",
                height: Platform.OS === "ios" ? 50 : 56,
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                paddingHorizontal: 16,
                color: "black",
                marginBottom: 24,
                fontSize: width > 350 ? 16 : 14,
              }}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
            />
          ) : (
            <TextInput
              ref={(ref) => setInputRef(ref)}
              style={{
                width: "100%",
                height: Platform.OS === "ios" ? 50 : 56,
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                paddingHorizontal: 16,
                color: "black",
                marginBottom: 24,
                fontSize: width > 350 ? 16 : 14,
                textAlign: "center",
              }}
              placeholder="Enter OTP"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
              maxLength={6}
            />
          )}

          <TouchableOpacity
            style={{
              width: "100%",
              height: Platform.OS === "ios" ? 50 : 56,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 20,
            }}
            onPress={handleAuthAction}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#8A2BE2", "#9370DB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 8,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size={Platform.OS === "ios" ? "small" : "large"} />
              ) : (
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: width > 350 ? 18 : 16,
                  }}
                >
                  {emailVerificationSent ? "Verify OTP" : "Continue with Email"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default AuthScreen

