const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config")
const { withNativeWind } = require("nativewind/metro")

const config = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    sourceExts: ["jsx", "js", "json",'ts', 'tsx'],
    assetExts: ["png", "jpg", "jpeg", "gif", "mp3", "mp4", "wav", "ttf"],
  },
})

module.exports = withNativeWind(config, { input: "./global.css" })

