import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ESL Platform - Host Service',
  description: 'MCP Orchestration Service for ESL Learning Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
