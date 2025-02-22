
import { Text, TouchableOpacity, Animated, View, useWindowDimensions } from "react-native";
import { useState } from "react";
import LinearGradient from "react-native-linear-gradient";

export default function Button({ title, onPress }) {
    const [scaleValue] = useState(new Animated.Value(1));
    const { width } = useWindowDimensions();

    const handlePressIn = () => {
        Animated.timing(scaleValue, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.timing(scaleValue, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start(() => onPress && onPress());
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
            <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8}>
                <LinearGradient
                    colors={["#A200FF", "#C000FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        paddingVertical: width < 360 ? 12 : 16,
                        borderRadius: 16, 
                        width: "100%", 
                        alignSelf: "center",
                        marginTop: 8,
                    }}
                >
                    <View style={{ alignItems: "center" }}>
                        <Text className={`text-white ${width < 360 ? 'text-base' : 'text-lg'} font-semibold font-poppinsBold`}>{title}</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}
