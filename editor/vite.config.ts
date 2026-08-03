import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const registryImages = path.resolve(rootDir, '../_registry/images')
const presentationImages = path.resolve(rootDir, '../presentation/images')

function catalogImagesPlugin(): Plugin {
  const imagesRoot = fs.existsSync(registryImages) ? registryImages : presentationImages
  return {
    name: 'catalog-images',
    configureServer(server) {
      server.middlewares.use('/images', (req, res, next) => {
        try {
          const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0] || '/')
          const resolved = path.resolve(imagesRoot, `.${requestPath}`)
          if (!resolved.startsWith(imagesRoot) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
            next()
            return
          }
          const ext = path.extname(resolved).toLowerCase()
          const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'application/octet-stream'
          res.setHeader('Content-Type', type)
          res.setHeader('Cache-Control', 'public, max-age=3600')
          fs.createReadStream(resolved).pipe(res)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), catalogImagesPlugin()],
    build: {
      sourcemap: true,
    },
  }
})
