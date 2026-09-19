import type { Metadata, Viewport } from "next";
import type { ReactElement, ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hey Food",
  description: "Order from Hey Food, no app needed",
};

// Phone-first: this page is what a QR scan opens in a mobile browser.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
