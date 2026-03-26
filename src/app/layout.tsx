import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CloudKitchen - AI Powered Food Ordering',
  description: 'WhatsApp-first food ordering platform powered by AI recommendations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
