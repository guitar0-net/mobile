// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { HeaderButton } from "@/components/ui/header-button";
import { useFavorites } from "@/features/settings";
import { capture } from "@/lib/analytics";

type BookmarkButtonProps = {
  lessonId: string;
};

export function BookmarkButton({ lessonId }: BookmarkButtonProps) {
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isBookmarked = favorites.includes(lessonId);

  return (
    <HeaderButton
      icon={
        isBookmarked
          ? { ios: "bookmark.fill", android: "bookmark_added" }
          : { ios: "bookmark", android: "bookmark_border" }
      }
      active={isBookmarked}
      onPress={() => {
        if (isBookmarked) removeFavorite(lessonId);
        else addFavorite(lessonId);
        capture("lesson_favorite_toggled", {
          lesson_id: lessonId,
          favorited: !isBookmarked,
        });
      }}
    />
  );
}
