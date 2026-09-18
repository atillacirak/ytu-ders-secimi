import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YTÜ Program Görselleştirici",
  description: "YTÜ OBS ders programı görselleştirme - gönüllü proje",
  metadataBase: new URL("https://ytuprogram.vercel.app"),
  openGraph: {
    title: "YTÜ Program Görselleştirici",
    description: "YTÜ OBS ders programı görselleştirme - gönüllü proje",
    url: "https://ytuprogram.vercel.app",
    siteName: "YTÜ Program Görselleştirici",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YTÜ Program Görselleştirici - OBS Ders Programı Çizelgeleme",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YTÜ Program Görselleştirici",
    description: "YTÜ OBS ders programı görselleştirme - gönüllü proje",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
