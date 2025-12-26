import type { Metadata, Viewport } from "next";
import "./globals.css";
import 'katex/dist/katex.min.css';
import RegisterServiceWorker from './register-sw';
import { Providers } from '@/components/Providers';
import SplashScreen from '@/components/SplashScreen';

export const metadata: Metadata = {
  title: "Mindup - Révision",
  description: "Application de révision par flashcards avec algorithme FSRS pour optimiser la mémorisation",
  applicationName: "Mindup",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mindup",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preload" href="/logo-animation.json" as="fetch" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <SplashScreen />
        <RegisterServiceWorker />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
