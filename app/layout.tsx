import type {Metadata} from 'next';
import './globals.css';
import { DemoProvider } from '@/context/DemoContext';
import { MessagesProvider } from '@/context/MessagesContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'WMS & Delivery',
  description: 'Warehouse management and last-mile delivery platform mockup',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Prevent flash of wrong theme on initial load */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();` }} />
        <ThemeProvider>
          <DemoProvider>
            <MessagesProvider>
              {children}
            </MessagesProvider>
          </DemoProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
