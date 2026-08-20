// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";

import {
  fetchCourseLessons,
  fetchCourses,
  type CourseLessonRow,
} from "@/features/lessons";

export type ReviewSection = {
  uuid: string;
  title: string;
  lessons: CourseLessonRow[];
};

/**
 * Every lesson of every course, grouped for the migration review. A lesson
 * that belongs to several courses is listed under the first one only — two
 * rows sharing one checkbox would read as a bug.
 */
export async function fetchReviewSections(): Promise<ReviewSection[]> {
  const courses = await fetchCourses();
  const seen = new Set<string>();
  const sections: ReviewSection[] = [];

  for (const course of courses) {
    const courseLessons = await fetchCourseLessons(course.uuid);
    const lessons = courseLessons.filter((lesson) => {
      if (seen.has(lesson.lessonUuid)) return false;
      seen.add(lesson.lessonUuid);
      return true;
    });
    if (lessons.length > 0) {
      sections.push({ uuid: course.uuid, title: course.title, lessons });
    }
  }

  return sections;
}

export function useReviewSections() {
  return useQuery({
    queryKey: ["migration", "review-sections"],
    queryFn: fetchReviewSections,
  });
}
