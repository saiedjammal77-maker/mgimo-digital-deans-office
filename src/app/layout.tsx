import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./globals.css";
import { LanguageProvider } from "@/components/identity";

export const metadata:Metadata={
  title:{default:"Atlas — MGIMO Digital Dean’s Office",template:"%s · Atlas MGIMO"},
  description:"The Digital Dean’s Office of the Future. A bilingual MGIMO competition project for navigating student life.",
  icons:{icon:"/compass.svg"},
};
export const viewport:Viewport={themeColor:"#07172D",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="ru"><body><LanguageProvider>{children}</LanguageProvider></body></html>
}
