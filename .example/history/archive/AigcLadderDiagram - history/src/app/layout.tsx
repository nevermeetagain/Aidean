import type { Metadata } from "next";
import "./globals.css";

import { RootShell } from "@/components/layout/RootShell";

export const metadata: Metadata = {
  title: "AI 模型天梯图（示例）",
  description: "AigcLadderDiagram 示例界面"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
