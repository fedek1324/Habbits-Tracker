import type { Metadata } from "next";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = {
  title: "Habits tracker",
  description: "Habits tracker app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{ height: "initial" }}
      >
        <GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID || ""}>
          {children}
        </GoogleOAuthProvider>;
      </body>
    </html>
  );
}
