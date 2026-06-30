import type { Metadata } from 'next'
import { Lora, DM_Sans } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
})

export const metadata: Metadata = {
  title: 'Mile Marker',
  description: 'Private post-run reflection journal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${lora.variable}`}>
      <body className="min-h-screen font-sans">
        <main className="max-w-md mx-auto px-4 pt-8 pb-24">
          {children}
        </main>
        <Nav />
      </body>
    </html>
  )
}
