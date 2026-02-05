import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ops Scorecard — Operation Summary',
  description: 'Upload Operation Summary reports into raw facts.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
