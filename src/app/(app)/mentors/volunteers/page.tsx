import { redirect } from 'next/navigation';

// Redirect to the new standalone volunteers module
export default function VolunteersRedirect() {
  redirect('/volunteers');
}
