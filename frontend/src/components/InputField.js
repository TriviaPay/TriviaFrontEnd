"use client"

import { useState } from "react"
import { View, TextInput, TouchableOpacity, useWindowDimensions } from "react-native"
import { FontAwesome } from "@expo/vector-icons"

export default function InputField({ icon, placeholder, secureTextEntry, value, onChangeText, ...props }) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry)
    const { width } = useWindowDimensions()

    return (
        <View className="flex-row items-center bg-inputBg px-4 py-2 rounded-2xl w-full mx-auto my-2">
            <FontAwesome name={icon} size={width < 360 ? 16 : 20} color="#cccccc" />
            <TextInput
                placeholder={placeholder}
                placeholderTextColor="#cccccc"
                secureTextEntry={secureTextEntry && !isPasswordVisible}
                value={value}
                onChangeText={onChangeText}
                className={`text-white flex-1 ml-3 ${width < 360 ? "text-base" : "text-lg"} font-poppinsRegular`}
                {...props}
            />
            {secureTextEntry && (
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                    <FontAwesome name={isPasswordVisible ? "eye" : "eye-slash"} size={width < 360 ? 16 : 20} color="#cccccc" />
                </TouchableOpacity>
            )}
        </View>
    )
}

