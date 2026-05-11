import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to dashboard by default. 
  // Middleware will push to /login if unauthenticated.
  redirect('/dashboard');
}
