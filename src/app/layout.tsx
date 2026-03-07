import type { Metadata } from "next";
import { 
  Geist, 
  Geist_Mono, 
  Playfair_Display, 
  Source_Sans_3, 
  Cormorant_Garamond, 
  Inter, 
  Sacramento, 
  Alex_Brush, 
  Montserrat, 
  Lora, 
  Open_Sans, 
  Cinzel, 
  Lato 
} from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sacramento = Sacramento({
  variable: "--font-sacramento",
  subsets: ["latin"],
  weight: "400",
});

const alexBrush = Alex_Brush({
  variable: "--font-alex-brush",
  subsets: ["latin"],
  weight: "400",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "QRPhoto - Event Photo Sharing",
  description:
    "Upload and share photos from events via QR code. No app or login required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${playfair.variable} 
          ${sourceSans.variable} 
          ${cormorant.variable} 
          ${inter.variable} 
          ${sacramento.variable} 
          ${alexBrush.variable} 
          ${montserrat.variable} 
          ${lora.variable} 
          ${openSans.variable} 
          ${cinzel.variable} 
          ${lato.variable} 
          antialiased
        `}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
