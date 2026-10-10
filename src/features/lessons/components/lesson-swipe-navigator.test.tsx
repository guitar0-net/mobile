// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { useState, type ReactNode } from "react";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";

import { Text } from "@/components/ui/text";
import { courseLessons, courses, initDb, lessons } from "@/lib/db";
import { createTestQueryClient } from "@/lib/network/__tests__/testing";

import { LessonSwipeNavigator } from "./lesson-swipe-navigator";
import { resetDbForTesting } from "../__tests__/testing";
import { fetchCourseLessons } from "../queries";

const LESSON_IDS = ["lesson-1", "lesson-2", "lesson-3"];

async function seedCourse() {
  const db = await initDb();
  await db.insert(courses).values({
    uuid: "course-1",
    title: "Beginner",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });
  await db.insert(lessons).values(
    LESSON_IDS.map((uuid) => ({
      uuid,
      title: uuid,
      videoUrl: "https://example.com/v.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    })),
  );
  await db.insert(courseLessons).values(
    LESSON_IDS.map((lessonUuid, index) => ({
      courseUuid: "course-1",
      lessonUuid,
      order: index + 1,
    })),
  );
}

async function renderNavigator(lessonId: string, children: ReactNode = null) {
  const client = createTestQueryClient();
  client.setQueryData(
    ["course-lessons", "course-1"],
    await fetchCourseLessons("course-1"),
  );
  const onNavigate = jest.fn();
  const tree = (id: string) => (
    <QueryClientProvider client={client}>
      <LessonSwipeNavigator lessonId={id} courseId="course-1" onNavigate={onNavigate}>
        {children}
      </LessonSwipeNavigator>
    </QueryClientProvider>
  );
  const { rerender } = render(tree(lessonId));
  return { onNavigate, showLesson: (id: string) => rerender(tree(id)) };
}

function swipe(translationX: number, velocityX = 0) {
  fireGestureHandler(getByGestureTestId("lesson-swipe"), [
    { state: State.BEGAN, translationX: 0 },
    { state: State.ACTIVE, translationX: 0 },
    { translationX, velocityX },
    { state: State.END, translationX, velocityX },
  ]);
}

beforeEach(async () => {
  resetDbForTesting();
  await seedCourse();
});

describe("LessonSwipeNavigator", () => {
  test("swiping left asks for the next lesson of the course", async () => {
    const { onNavigate } = await renderNavigator("lesson-2");

    swipe(-120);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ lessonUuid: "lesson-3", order: 3 }),
    );
  });

  test("swiping right asks for the previous lesson of the course", async () => {
    const { onNavigate } = await renderNavigator("lesson-2");

    swipe(120);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ lessonUuid: "lesson-1", order: 1 }),
    );
  });

  test("a short fast flick counts as a swipe", async () => {
    const { onNavigate } = await renderNavigator("lesson-2");

    swipe(-30, -900);

    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ lessonUuid: "lesson-3" }),
    );
  });

  test("a short slow drag is ignored", async () => {
    const { onNavigate } = await renderNavigator("lesson-2");

    swipe(-30, -100);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("the first lesson has nothing to swipe back to", async () => {
    const { onNavigate } = await renderNavigator("lesson-1");

    swipe(120);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("the last lesson has nothing to swipe forward to", async () => {
    const { onNavigate } = await renderNavigator("lesson-3");

    swipe(-120);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("a cancelled gesture does not navigate", async () => {
    const { onNavigate } = await renderNavigator("lesson-2");

    fireGestureHandler(getByGestureTestId("lesson-swipe"), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: 0 },
      { state: State.CANCELLED, translationX: -120 },
    ]);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("children start from scratch when the lesson changes", async () => {
    let mounts = 0;
    function MountCounter() {
      const [mount] = useState(() => ++mounts);
      return <Text>mount {mount}</Text>;
    }
    const { showLesson } = await renderNavigator("lesson-1", <MountCounter />);

    showLesson("lesson-2");

    expect(screen.getByText("mount 2")).toBeTruthy();
  });
});
