import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kitchen Dashboard - CloudKitchen',
  description: 'Manage orders and kitchen operations',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">CloudKitchen 🍳</h1>
          <div className="space-x-4">
            <a href="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </a>
            <a href="/dashboard/menu" className="text-gray-700 hover:text-blue-600">
              Menu
            </a>
            <a href="/dashboard/analytics" className="text-gray-700 hover:text-blue-600">
              Analytics
            </a>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
