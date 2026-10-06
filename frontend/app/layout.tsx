import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduVoice",
  description: "Anonymous student feedback that the server cannot trace back to you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
