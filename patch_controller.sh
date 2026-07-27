#!/bin/bash
sed -i '' 's/import { asyncHandler } from '"'"'..\/utils\/asyncHandler.js'"'"';/import { asyncHandler } from '"'"'..\/utils\/asyncHandler.js'"'"';\nimport { createNotification } from '"'"'.\/notificationController.js'"'"';\nimport { NotificationType } from '"'"'..\/generated\/client\/index.js'"'"';/' server/src/controllers/editDeleteController.ts
