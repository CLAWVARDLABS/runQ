import '@xyflow/react/dist/style.css';
import './globals.css';

const description = 'RunQ captures agent runs, scores run quality, and turns local telemetry into evidence-backed workflow recommendations.';

export const metadata = {
  applicationName: 'RunQ',
  title: {
    default: 'RunQ',
    template: '%s · RunQ'
  },
  description,
  keywords: [
    'RunQ',
    'agent observability',
    'AI agents',
    'run quality',
    'local telemetry',
    'OpenTelemetry',
    'Codex',
    'Claude Code',
    'OpenClaw'
  ],
  authors: [{ name: 'RunQ contributors' }],
  creator: 'RunQ contributors',
  publisher: 'RunQ',
  category: 'developer tools',
  metadataBase: new URL('https://github.com/THEZIONLABS/runQ'),
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/icon.svg',
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' }
    ]
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'RunQ',
    description,
    siteName: 'RunQ',
    type: 'website',
    images: [
      {
        url: '/runq-og.svg',
        width: 1200,
        height: 630,
        alt: 'RunQ agent run quality observability'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RunQ',
    description,
    images: ['/runq-og.svg']
  }
};

export const viewport = {
  themeColor: '#0050cb',
  colorScheme: 'light'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background font-sans">{children}</body>
    </html>
  );
}
