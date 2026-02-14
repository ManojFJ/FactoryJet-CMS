import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FactoryJet-CMS",
  description: "AI-Powered CMS Builder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        {children}
        {/* S1.5: Global Toast System */}
        <Toaster 
          position="top-right" 
          theme="dark" 
          richColors 
          closeButton
          toastOptions={{
            style: { 
              background: '#111', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff' 
            },
          }}
        />
      </body>
    </html>
  );
}