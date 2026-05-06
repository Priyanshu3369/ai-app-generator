import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI App Generator — Build Apps from JSON Config",
  description: "Transform structured JSON configurations into fully working web applications with dynamic UI, REST APIs, PostgreSQL database, and authentication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
