import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import IOSSwipeBlocker from "@/components/IOSSwipeBlocker";
import GlobalSwipeNavigator from "@/components/GlobalSwipeNavigator";
import ZoomBlocker from "@/components/ZoomBlocker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KiWA Labs",
    template: "%s | KiWA Labs",
  },
  description: "Anything you can imagine, we can build! KiWA Labs is a digital studio focused on thoughtfully crafted, scalable, and secure platforms.",
  openGraph: {
    title: "KiWA Labs",
    description: "Anything you can imagine, we can build!",
    url: "https://kiwalabs.com",
    siteName: "KiWA Labs",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KiWA Labs",
    description: "Anything you can imagine, we can build!",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <IOSSwipeBlocker />
        <GlobalSwipeNavigator />
        <ZoomBlocker />
        <main>{children}</main>
      </body>
    </html>
  );
}
