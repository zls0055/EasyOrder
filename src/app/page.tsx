
import { redirect } from 'next/navigation';

// The root page now redirects to a default or example restaurant.
// In a real application, this could be a landing page listing all restaurants.
export default function RootPage() {
  // For now, let's assume a default restaurant ID exists for demonstration.
  // Replace 'default-restaurant' with an actual ID from your database.
  // A better approach might be to redirect to the /admin page to create a restaurant first.
  redirect('/admin');
}
