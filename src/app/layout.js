import { Space_Grotesk, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/components/AuthContext';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata = {
  title: 'Conversational Anki — AI-Powered Study Tool',
  description:
    'Free, open-source study tool combining spaced repetition with AI-powered tutoring for smarter learning.',
  keywords: ['anki', 'flashcards', 'spaced repetition', 'AI tutor', 'study tool'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
