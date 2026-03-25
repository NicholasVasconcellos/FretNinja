import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="quiz"
          options={{
            gestureEnabled: false,
            animation: 'fade_from_bottom',
          }}
        />
        <Stack.Screen
          name="results"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}
