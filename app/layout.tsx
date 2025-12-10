import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "react-flow-renderer/dist/style.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/theme/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CodeReforge — Rebuild Your Logic",
  description: "An interactive debugging and visualization platform that forces novices to think before they run",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

