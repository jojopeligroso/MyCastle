import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyCastle - ESL Learning Platform',
  description:
    'ESL school operations platform with timetable management and AI-assisted lesson planning',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
