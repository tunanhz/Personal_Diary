import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Diary",
  description: "Personal Diary app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
            <nav className="w-full border-b bg-white/60 dark:bg-black/60 py-3 px-6">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <a href="/" className="font-semibold">
                  Personal Diary
                </a>
                <div className="flex gap-4">
                  <a href="/login" className="text-sm">
                    Login
                  </a>
                  <a href="/register" className="text-sm">
                    Register
                  </a>
                </div>
              </div>
            </nav>
            <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
