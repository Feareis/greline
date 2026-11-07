import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { fr } from "@greline/i18n";
import "./globals.css";
import { ConsoleGreeting } from "@/components/console-greeting";
import { themeCss, themeScript } from "@/lib/theme-tokens";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Greline",
  description: fr.app.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme on <html> before hydration, hence the suppressed warning.
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <ConsoleGreeting />
      </body>
    </html>
  );
}
