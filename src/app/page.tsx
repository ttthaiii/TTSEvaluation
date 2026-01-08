import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
  return null; // This code will usually not be reached
}