"use client"

import { useEffect, useState, useRef } from "react"
import { View, StyleSheet, Dimensions } from "react-native"
import LottieView from "lottie-react-native"
import { useNavigation } from "@react-navigation/native"

const { width, height } = Dimensions.get("window")

const SplashScreen = () => {
  const navigation = useNavigation()
  const [showSnowflake1, setShowSnowflake1] = useState(false)
  const [showSnowflake2, setShowSnowflake2] = useState(false)
  const [showSnowflake3, setShowSnowflake3] = useState(false)
  const [showSnowflake4, setShowSnowflake4] = useState(false)
  const [showSnowflake5, setShowSnowflake5] = useState(false)
  const splashAnimationRef = useRef(null)

  useEffect(() => {
    // Delay falling leaves animations
    const timer1 = setTimeout(() => setShowSnowflake1(true), 0)
    const timer2 = setTimeout(() => setShowSnowflake2(true), 1000)
    const timer3 = setTimeout(() => setShowSnowflake3(true), 2000)
    const timer4 = setTimeout(() => setShowSnowflake4(true), 3000)
    const timer5 = setTimeout(() => setShowSnowflake5(true), 4000)

    // Navigate
    const navigationTimer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      })
    }, 7800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearTimeout(timer5)
      clearTimeout(navigationTimer)
    }
  }, [navigation])

  return (
    <View style={styles.container}>
      {/* Splash Animation */}
      <LottieView
        ref={splashAnimationRef}
        source={require("../../assets/lottie/splash.json")}
        autoPlay
        style={styles.fullScreenAnimation}
        resizeMode="cover"
      />

      {/* Falling Leaves Animations */}
      {showSnowflake1 && (
        <View style={[styles.leafs, { top: -height * 0.05, left: -width * 0.1 }]}>
          <LottieView
            source={require("../../assets/lottie/leafs_falling.json")}
            autoPlay
            loop
            style={[styles.leafAnimation, { width: width * 1.2, height: height * 0.6 }]}
          />
        </View>
      )}

      {showSnowflake2 && (
        <View style={[styles.leafs, { top: -height * 0.1, right: -width * 0.1 }]}>
          <LottieView
            source={require("../../assets/lottie/leafs_falling.json")}
            autoPlay
            loop
            style={[styles.leafAnimation, { width: width * 1.2, height: height * 0.6 }]}
          />
        </View>
      )}

      {showSnowflake3 && (
        <View style={[styles.leafs, { bottom: -height * 0.05, left: -width * 0.1 }]}>
          <LottieView
            source={require("../../assets/lottie/leafs_falling.json")}
            autoPlay
            loop
            style={[styles.leafAnimation, { width: width * 1.2, height: height * 0.6 }]}
          />
        </View>
      )}

      {showSnowflake4 && (
        <View style={[styles.leafs, { top: -height * 0.15, left: -width * 0.2 }]}>
          <LottieView
            source={require("../../assets/lottie/leafs_falling.json")}
            autoPlay
            loop
            style={[styles.leafAnimation, { width: width * 1.2, height: height * 0.6 }]}
          />
        </View>
      )}

      {showSnowflake5 && (
        <View style={[styles.leafs, { bottom: -height * 0.1, right: -width * 0.2 }]}>
          <LottieView
            source={require("../../assets/lottie/leafs_falling.json")}
            autoPlay
            loop
            style={[styles.leafAnimation, { width: width * 1.2, height: height * 0.6 }]}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  fullScreenAnimation: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  leafs: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  leafAnimation: {
    width: Dimensions.get("window").width * 1.2,
    height: Dimensions.get("window").height * 0.6,
  },
})

export default SplashScreen