UPDATE `schemes` SET `local_image_path` = `id` || '.png' WHERE `local_image_path` IS NOT NULL;
