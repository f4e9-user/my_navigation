import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloudflare 系统入口导航站",
  description: "自动同步 Cloudflare 子域名资产的安全系统导航页",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
