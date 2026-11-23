// Simple script to run prisma generate
const { execSync } = require('child_process');
try {
  execSync('prisma generate --schema "./Database/prisma/schema.prisma"', {
    cwd: 'C:\\Users\\USER\\Desktop\\PROJECT HONORE\\EIA ASSESSMENT HUB',
    stdio: 'inherit',
  });
  console.log('Done');
} catch (e) {
  console.error('Failed', e.message);
}