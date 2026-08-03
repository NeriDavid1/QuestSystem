/** Resolve catalog registry image paths for the editor UI. */

export function catalogImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  const relative = imagePath.replace(/^\/+/, '')

  const configured = import.meta.env.VITE_CATALOG_IMAGE_BASE as string | undefined
  if (configured) {
    return `${configured.replace(/\/$/, '')}/${relative}`
  }

  const editorBase = import.meta.env.BASE_URL || '/'
  // Local Vite (`/`) serves `_registry/images` at `/images` via middleware.
  if (editorBase === '/' || editorBase === './') {
    return `/${relative}`
  }

  // GitHub Pages: editor lives at …/editor/, images at …/images/.
  const siteRoot = editorBase.replace(/\/?editor\/?$/, '/').replace(/\/?$/, '/')
  return `${siteRoot}${relative}`
}
