import './globals.css'

export const metadata = { title: 'School Portal' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
