import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'create-404',
            writeBundle(options) {
                const indexHtml = path.resolve(options.dir, 'index.html');
                const p404Html = path.resolve(options.dir, '404.html');
                if (fs.existsSync(indexHtml)) {
                    fs.copyFileSync(indexHtml, p404Html);
                }
            }
        }
    ],
    base: '/barberpage/',
})
