import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeCraft - AI Coding Agent",
  description: "AI-powered coding agent that reads, writes, and pushes code to your GitHub repos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
