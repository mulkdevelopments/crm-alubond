import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Alubond CRM — Sales Intelligence',
    short_name: 'Alubond CRM',
    description:
      'A modern, mobile-first sales war room for façade systems and ACP — built for Alubond.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#FAFAFA',
    icons: [
      {
        src: '/brand/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/brand/favicon.png',
        sizes: '48x48',
        type: 'image/png',
      },
    ],
  };
}
