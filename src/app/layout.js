import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "멍냥플레이스 · 반려동물 동반 장소 지도",
  description: "반려동물과 함께 갈 수 있는 카페·밥집·펜션을 찾고, 후기 남기고, 즐겨찾기 하는 지도 🐾",
  openGraph: {
    title: "멍냥플레이스 🐾",
    description: "반려동물과 함께 갈 수 있는 곳을 찾고 기록하는 지도",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 min-h-0">{children}</main>
      </body>
    </html>
  );
}