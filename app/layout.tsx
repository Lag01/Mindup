import type { Metadata } from "next";
import "./globals.css";
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: "Flashcards - Révision",
  description: "Application de révision par flashcards avec algorithme FSRS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
