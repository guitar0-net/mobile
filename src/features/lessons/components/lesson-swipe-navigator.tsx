// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Fragment, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAdjacentLessons } from "../queries";
import type { CourseLessonRow } from "../queries";

const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MIN_VELOCITY = 600;
const IOS_BACK_SWIPE_EDGE_WIDTH = 24;
const SLIDE_IN_DURATION_MS = 220;

type Props = {
  lessonId: string;
  courseId: string;
  onNavigate: (lesson: CourseLessonRow) => void;
  children: ReactNode;
};

/**
 * Swiping left or right asks for the next or previous lesson of the course.
 * Children are remounted for every lesson, so no state leaks between them.
 */
export function LessonSwipeNavigator({
  lessonId,
  courseId,
  onNavigate,
  children,
}: Props) {
  const { previous, next } = useAdjacentLessons(lessonId, courseId);
  const { width } = useWindowDimensions();
  const offsetX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.get() }],
  }));

  function slideTo(lesson: CourseLessonRow | null, enterFrom: 1 | -1) {
    if (!lesson) return;
    onNavigate(lesson);
    offsetX.set(
      withSequence(
        withTiming(enterFrom * width, { duration: 0 }),
        withTiming(0, { duration: SLIDE_IN_DURATION_MS }),
      ),
    );
  }

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .hitSlop({ left: -IOS_BACK_SWIPE_EDGE_WIDTH })
    .withTestId("lesson-swipe")
    .onEnd((event, success) => {
      const isSwipe =
        Math.abs(event.translationX) >= SWIPE_MIN_DISTANCE ||
        Math.abs(event.velocityX) >= SWIPE_MIN_VELOCITY;
      if (!success || !isSwipe) return;
      if (event.translationX < 0) slideTo(next, 1);
      else slideTo(previous, -1);
    });

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View className="flex-1" style={animatedStyle}>
        <Fragment key={lessonId}>{children}</Fragment>
      </Animated.View>
    </GestureDetector>
  );
}
