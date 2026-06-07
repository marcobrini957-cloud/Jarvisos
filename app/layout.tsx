import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { DisplayModeProvider } from '@/context/DisplayModeContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  // Load the weights we actually use
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Jarvis OS',
  description: 'Personal trading and life operating system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="h-full overflow-hidden">
        <DisplayModeProvider>{children}</DisplayModeProvider>
      </body>
    </html>
  )
}
