import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

// Root layout for the NextGem Volunteer Platform.
// Wraps every page with the navbar and global styles.
export const metadata: Metadata = {
  title: 'NextGem Volunteer Platform',
  description:
    'Gamified volunteer platform for NextGem Foundation - check in, log hours, earn badges.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container-page py-6">{children}</main>
      </body>
    </html>
  );
}
