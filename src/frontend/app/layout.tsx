import type { Metadata } from "next";
import { geistSans, geistMono } from "@/app/ui/fonts";
import "./globals.css";
import Navbar from "@/app/ui/navbar";

export const metadata: Metadata = {
  title: "Co-Apt",
  description: "Find your perfect home with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="silk">
      <body
        className={`${geistSans.className} ${geistMono.className} antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        <div>{children}</div>
      </body>
    </html>
  );
}
