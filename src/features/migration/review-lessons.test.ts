// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { resetDbForTesting } from "@/features/lessons/__tests__/testing";
import { courseLessons, courses, initDb, lessons } from "@/lib/db";

import { fetchReviewSections } from "./review-lessons";

async function seedCourses() {
  const db = await initDb();

  await db.insert(courses).values([
    {
      uuid: "course-1",
      title: "Основной курс",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      uuid: "course-2",
      title: "Подборки",
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    },
  ]);
  await db.insert(lessons).values([
    {
      uuid: "lesson-1",
      title: "Знакомство с гитарой",
      videoUrl: "https://example.com/1",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      uuid: "lesson-2",
      title: "Первые аккорды",
      videoUrl: "https://example.com/2",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ]);
}

beforeEach(() => {
  resetDbForTesting();
});

it("lists a lesson belonging to two courses under the first one only", async () => {
  await seedCourses();
  const db = await initDb();
  await db.insert(courseLessons).values([
    { courseUuid: "course-1", lessonUuid: "lesson-1", order: 1 },
    { courseUuid: "course-2", lessonUuid: "lesson-1", order: 1 },
    { courseUuid: "course-2", lessonUuid: "lesson-2", order: 2 },
  ]);

  const sections = await fetchReviewSections();

  expect(sections.map((section) => section.uuid)).toEqual(["course-1", "course-2"]);
  expect(sections[0].lessons.map((lesson) => lesson.lessonUuid)).toEqual(["lesson-1"]);
  expect(sections[1].lessons.map((lesson) => lesson.lessonUuid)).toEqual(["lesson-2"]);
});

it("drops a course whose every lesson is already listed", async () => {
  await seedCourses();
  const db = await initDb();
  await db.insert(courseLessons).values([
    { courseUuid: "course-1", lessonUuid: "lesson-1", order: 1 },
    { courseUuid: "course-2", lessonUuid: "lesson-1", order: 1 },
  ]);

  const sections = await fetchReviewSections();

  expect(sections.map((section) => section.uuid)).toEqual(["course-1"]);
});
