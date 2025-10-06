import type { Metadata } from "next";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import StoreProvider from "./StoreProvider";

export const metadata: Metadata = {
  title: "Habits tracker",
  description: "Habits tracker app",
};

// https://redux.js.org/usage/nextjs#caching
export const dynamic = 'force-dynamic'

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
        <StoreProvider>
          <GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID || ""}>
            {children}
          </GoogleOAuthProvider>;
        </StoreProvider>
      </body>
    </html>
  );
}
