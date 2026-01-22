#!/bin/bash

# VolleyBratans Server Update Script

echo "🔄 Updating VolleyBratans Stream..."

# 1. Pull latest code
echo "⬇️  Pulling changes from GitHub..."
git pull

# 2. Rebuild and Restart Containers
echo "🐳 Rebuilding and Restarting Docker Containers..."
# -d = Detached mode (runs in background)
# --build = Rebuild images if Dockerfile changed
docker compose up -d --build

# 3. Prune old images (save disk space)
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Update Complete! System is running."
