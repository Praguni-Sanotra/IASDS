import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/providers/theme-provider";
import { Toaster } from "sonner";
import { InstallPrompt } from "../components/pwa/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IASDS — Smart Timetable",
  description: "Intelligent Academic Scheduling & Decision-Support System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IASDS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#185FA5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <InstallPrompt />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
