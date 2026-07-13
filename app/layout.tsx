import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "百炼知识库管理",
  description: "阿里云百炼平台特定知识库管理工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
