module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // ✅ Enables NativeWind’s JSX transform automatically
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // ✅ If you also use Reanimated, uncomment this line:
    // plugins: ['react-native-reanimated/plugin'],
  };
};
