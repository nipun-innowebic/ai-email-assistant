import fs from 'fs';
import path from 'path';

const dashboardDir = path.join(process.cwd(), 'app', 'dashboard');
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
  console.log('✓ Dashboard directory created');
} else {
  console.log('✓ Dashboard directory already exists');
}
