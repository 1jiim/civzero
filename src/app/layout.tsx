import type { Metadata } from 'next'
import { Mozilla_Headline } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'

const mozillaHeadline = Mozilla_Headline({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mozilla-headline',
  display: 'swap',
})

const sfDisplay = localFont({
  src: [
    { path: './fonts/SF-Pro-Display-Regular.otf',  weight: '400', style: 'normal' },
    { path: './fonts/SF-Pro-Display-Medium.otf',   weight: '500', style: 'normal' },
    { path: './fonts/SF-Pro-Display-Semibold.otf', weight: '600', style: 'normal' },
    { path: './fonts/SF-Pro-Display-Bold.otf',     weight: '700', style: 'normal' },
  ],
  variable: '--font-sf-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Civilization Zero',
  description: 'The last city.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${sfDisplay.variable} ${mozillaHeadline.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-primary font-body" suppressHydrationWarning>
        <AuthProvider>
          <Nav />
          <main className="flex flex-col flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
