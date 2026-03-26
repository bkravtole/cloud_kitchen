'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DeliverySignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicleType: 'bike' as const,
    vehicleNumber: '',
    licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/delivery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          restaurantId: 'rest_001',
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('✅ Registration successful!');
      setTimeout(() => router.push('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-sm text-orange-600 hover:text-orange-800 mb-6 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚚 Join Our Delivery Team</h1>
          <p className="text-gray-600">Sign up to start earning with CloudKitchen</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          {success ? (
            <div className="p-4 bg-green-100 border border-green-400 text-green-800 rounded text-center">
              <p className="font-semibold">{success}</p>
              <p className="text-sm mt-2">Redirecting to home...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="9876543210"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vehicle Type *
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                >
                  <option value="bike">🏍️ Bike</option>
                  <option value="scooter">🛴 Scooter</option>
                  <option value="car">🚗 Car</option>
                </select>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vehicle Number (Optional)
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="KA01AB1234"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  License Number (Optional)
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="DL00001234"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Register as Delivery Boy'}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-600 text-center">
                By registering, you agree to our{' '}
                <a href="#" className="text-orange-600 hover:underline">
                  Terms of Service
                </a>
              </p>
            </form>
          )}
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg text-center shadow">
            <p className="text-2xl mb-2">💰</p>
            <p className="text-xs font-semibold text-gray-700">Flexible Pay</p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center shadow">
            <p className="text-2xl mb-2">⏰</p>
            <p className="text-xs font-semibold text-gray-700">Your Hours</p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center shadow">
            <p className="text-2xl mb-2">⭐</p>
            <p className="text-xs font-semibold text-gray-700">Build Rating</p>
          </div>
        </div>
      </div>
    </div>
  );
}
