import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '星核 Orb Core — 你的私人卫星',
  description: '每个人都能拥有一颗私人卫星 — 太空 AI、太空相机、永恒太阳',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
