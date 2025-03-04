"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Keyboard,
  Image,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { verifyEmailCode } from "../auth/authService"
import { useDispatch } from "react-redux"
import { setAuthenticated } from "../store/authSlice"
import { storeTokens } from "../auth/auth0"
import LinearGradient from "react-native-linear-gradient"

const { width, height } = Dimensions.get("window")

const OtpScreen = ({ route }) => {
  const { email } = route.params || { email: "" }
  const [otp, setOtp] = useState("")
  const [inputRef, setInputRef] = useState(null)
  const navigation = useNavigation()
  const dispatch = useDispatch()

  useEffect(() => {
    setTimeout(() => {
      if (inputRef) {
        inputRef.focus()
      }
    }, 500)
  }, [inputRef])

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a 6-digit code")
      return
    }

    try {
      const { accessToken, idToken } = await verifyEmailCode(email, otp)
      await storeTokens(accessToken, idToken)
      dispatch(setAuthenticated({ email }))
      navigation.navigate("Home")
    } catch (error) {
      Alert.alert("Verification Failed", error.message)
    }
  }

  // Handle submit
  const handleSubmit = () => {
    Keyboard.dismiss()
    handleVerifyOtp()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#DDD1EB" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDD1EB" />

      {/* Logo */}
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
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Enter Verification Code
          </Text>

          <Text
            style={{
              color: "#555",
              fontSize: 16,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            We've sent a 6-digit code to {email}
          </Text>

          <TextInput
            ref={(ref) => setInputRef(ref)}
            style={{
              width: "100%",
              height: Platform.OS === "ios" ? 50 : 56,
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              paddingHorizontal: 16,
              color: "black",
              marginBottom: 24,
              fontSize: width > 350 ? 18 : 16,
              textAlign: "center",
              letterSpacing: 8,
            }}
            placeholder="000000"
            placeholderTextColor="#999"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false}
            maxLength={6}
            textContentType="oneTimeCode" // iOS autofill from SMS
            autoComplete="sms-otp" // Android autofill from SMS
          />

          <TouchableOpacity
            style={{
              width: "100%",
              height: Platform.OS === "ios" ? 50 : 56,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 20,
            }}
            onPress={handleVerifyOtp}
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
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: width > 350 ? 18 : 16,
                }}
              >
                Verify Code
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default OtpScreen

