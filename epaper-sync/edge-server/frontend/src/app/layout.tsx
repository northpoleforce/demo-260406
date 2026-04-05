import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "700"],  // Regular + Bold 覆盖正文与标题
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vercel Epoch Menu",
  description: "Real-time generative premium menu deployed on Vercel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={notoSansSC.variable}>
      <body>{children}</body>
    </html>
  );
}
