import { redirect } from 'next/navigation';

export default function Page() {
  // Redirigir al módulo público /roles (mantenemos una única fuente de verdad)
  redirect('/roles');
}
