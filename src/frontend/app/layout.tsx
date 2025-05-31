import type { Metadata } from "next";
import { geistSans, geistMono, notoSans, sen } from "@/app/ui/fonts";
import "./globals.css";
import Navbar from "@/app/ui/navbar";
import CookieConsent from "@/app/ui/CookieConsent";

export const metadata: Metadata = {
  title: "Co-Apt",
  description: "Find your perfect home with ease.",
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌆</text></svg>',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    apple: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌆</text></svg>',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  },
};

import { ListingsProvider } from "@/app/context/ListingsContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="autumn" className={sen.variable}>
      <body
        className="antialiased min-h-screen flex flex-col"
      >
        <ListingsProvider>
          <Navbar />
          <div>{children}</div>
          <CookieConsent />
        </ListingsProvider>
      </body>
    </html>
  );
}
