import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 網址確定後改這裡（Vercel 專案名稱決定 *.vercel.app 子網域）
export default defineConfig({
  site: process.env.SITE_URL || 'https://gov-lottery-radar.vercel.app',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
