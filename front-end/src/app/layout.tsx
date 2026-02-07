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
          <div className="min-h-screen bg-slate-50 text-slate-900">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
            <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-400">
              © 2026 Personal Diary. Built with ❤️
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
