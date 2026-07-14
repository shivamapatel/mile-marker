import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mile Marker',
    short_name: 'Mile Marker',
    description: 'A private place to reflect on every run.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#F5F7FA',
    icons: [
      {
        src: '/brand/app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
