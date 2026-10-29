import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard') // proxy.js sends logged-out visitors on to /login
}
