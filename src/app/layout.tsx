import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/contexts/SessionContext";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tuzu Home Risk Scan",
  description: "AI-powered home security risk analysis. Upload photos of your windows, doors, and locks for instant security assessment.",
  keywords: ["home security", "risk assessment", "AI analysis", "window security", "door security"],
  authors: [{ name: "Tuzu Security" }],
  openGraph: {
    title: "Tuzu Home Risk Scan",
    description: "AI-powered home security risk analysis",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e3a5f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SessionProvider>
          <ToastProvider>
            <main className="min-h-screen bg-background">
              {children}
            </main>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
