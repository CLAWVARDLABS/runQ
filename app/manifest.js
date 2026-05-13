export default function manifest() {
  return {
    name: 'RunQ',
    short_name: 'RunQ',
    description: 'Local observability and run-quality scoring for agent runs.',
    start_url: '/agents',
    display: 'standalone',
    background_color: '#f7f9fb',
    theme_color: '#0050cb',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };
}
