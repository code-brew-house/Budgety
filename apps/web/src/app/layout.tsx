import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';

import type { Metadata, Viewport } from 'next';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Budgety',
  description: 'Family budget tracker',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#228be6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="light">
          <Providers>{children}</Providers>
        </MantineProvider>
      </body>
    </html>
  );
}
