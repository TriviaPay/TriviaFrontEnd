"use client"

import { useEffect } from "react"
import { View, Text, TouchableOpacity, Alert, SafeAreaView, StatusBar, Dimensions, Platform, Image } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useDispatch } from "react-redux"
import { logoutUser } from "../store/authSlice"
import { Linking } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { useSelector } from "react-redux"

const { width, height } = Dimensions.get("window")

const HomeScreen = () => {
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  // Extract username from email 
  const getUserName = () => {
    if (!user || !user.email) return "User"
    const emailParts = user.email.split("@")
    if (emailParts.length > 0) {
      const username = emailParts[0]
      return username.charAt(0).toUpperCase() + username.slice(1)
    }
    return "User"
  }

  // greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  useEffect(() => {
    const handleUrl = (event) => {
      if (event.url.includes("/logout")) {
        navigation.replace("Auth")
      }
    }
    const subscription = Linking.addEventListener("url", handleUrl)

    return () => subscription.remove()
  }, [navigation])

  const handleLogout = async () => {
    try {
      console.log("Initiating Auth0 logout...")
      await dispatch(logoutUser()).unwrap()
      navigation.replace("Auth")
    } catch (error) {
      console.error("Logout error:", error)
      Alert.alert("Logout Failed", error.message)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#DDD1EB" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#DDD1EB" />

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
              width: 48,
              height: 48,
              borderRadius: 24,
              resizeMode: "contain",
            }}
          />
          <Text
            style={{
              color: "black",
              fontSize: 16,
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
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: "#722F37",
              fontSize: 22,
              fontWeight: "bold",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {getGreeting()}, {getUserName()}!
          </Text>

          <Text
            style={{
              color: "#722F37",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Welcome to TriviaPay
          </Text>

          <Text
            style={{
              color: "#555",
              fontSize: 16,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            We're delighted to have you with us. Enjoy your experience!
          </Text>

          <TouchableOpacity
            onPress={handleLogout}
            style={{
              width: width * 0.5,
              maxWidth: 200,
              height: Platform.OS === "ios" ? 50 : 56,
              borderRadius: 8,
              overflow: "hidden",
            }}
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
                Logout
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default HomeScreen

