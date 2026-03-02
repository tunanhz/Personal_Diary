import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthProvider";
import Navbar from "./components/Navbar";

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
          <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">{children}</main>
            <footer className="border-t border-slate-200/60 py-8 mt-auto">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
                    <span className="text-white text-xs">📓</span>
                  </div>
                  <span className="text-sm font-semibold gradient-text">Personal Diary</span>
                </div>
                <p className="text-sm text-slate-400">
                  © 2026 Personal Diary. Built with ❤️ and ☕ by <span style={{color: 'red'}}>@Dương Tuấn Anh</span>
                </p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
