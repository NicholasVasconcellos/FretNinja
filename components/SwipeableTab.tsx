import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 500;

type Props = {
  children: React.ReactNode;
  prevTab?: string;
  nextTab?: string;
};

export function SwipeableTab({ children, prevTab, nextTab }: Props) {
  const router = useRouter();
  const translateX = useSharedValue(0);

  const navigateToTab = (tab: string) => {
    router.navigate(tab as any);
    translateX.value = 0;
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      // Clamp drag direction if no tab in that direction
      if (e.translationX > 0 && !prevTab) {
        translateX.value = e.translationX * 0.15; // rubber-band
        return;
      }
      if (e.translationX < 0 && !nextTab) {
        translateX.value = e.translationX * 0.15; // rubber-band
        return;
      }
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const swipedRight =
        (e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD) && prevTab;
      const swipedLeft =
        (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD) && nextTab;

      if (swipedRight && prevTab) {
        translateX.value = withSpring(
          SCREEN_WIDTH,
          { damping: 20, stiffness: 200 },
          () => runOnJS(navigateToTab)(prevTab),
        );
      } else if (swipedLeft && nextTab) {
        translateX.value = withSpring(
          -SCREEN_WIDTH,
          { damping: 20, stiffness: 200 },
          () => runOnJS(navigateToTab)(nextTab),
        );
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
