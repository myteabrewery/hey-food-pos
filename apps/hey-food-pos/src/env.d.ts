// Expo's Babel preset inlines `process.env.EXPO_PUBLIC_*` at bundle time; this
// declares just those names so config.ts type-checks without pulling Node's
// types into a React Native app.
declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_POS_BUSINESS_ID?: string;
    EXPO_PUBLIC_POS_USE_MOCK_ORDERS?: string;
  };
};
