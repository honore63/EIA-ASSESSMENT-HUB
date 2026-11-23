@echo off
cd "C:\Users\USER\Desktop\PROJECT HONORE\EIA ASSESSMENT HUB"
call npm exec -- prisma generate --schema "Database\prisma\schema.prisma"