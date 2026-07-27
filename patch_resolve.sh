#!/bin/bash
sed -i '' 's/import { NotificationType } from '"'"'..\/generated\/client\/index.js'"'"';/import { NotificationType } from '"'"'..\/generated\/client\/index.js'"'"';\nimport { resolveTargetName } from '"'"'..\/utils\/resolveEntity.js'"'"';/' server/src/controllers/editDeleteController.ts
