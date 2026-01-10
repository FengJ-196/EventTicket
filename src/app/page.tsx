"use client";

import { Calendar, Search, MapPin, Ticket, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  address: string;
  event_date: string;
  capacity: number;
  available_seats: number;
  status: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: '',
    fromDate: '',
    toDate: ''
  });
  const router = useRouter();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters);
      const res = await fetch(`/api/events?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            EventTicketing
          </h1>
          <nav className="space-x-4 flex items-center">
            {currentUser?.role === 'ADMIN' ? (
              <Link href="/admin/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Admin Dashboard
              </Link>
            ) : (
              <>
                <Link href="/organizer/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                  Organizer
                </Link>
                <Link href="/tickets" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                  My Tickets
                </Link>
              </>
            )}

            {currentUser ? (
              <div className="flex items-center gap-4 ml-4">
                <span className="text-sm font-bold text-gray-700">Hi, {currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors border border-red-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                  Log in
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero / Search Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
              Find your next experience.
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              Browse thousands of events happening around you.
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-4xl mx-auto bg-gray-100 p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-inner">
            <input
              type="text"
              placeholder="Search events, artists, venues..."
              className="flex-grow px-6 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                type="date"
                className="w-full md:w-auto px-4 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
              <input
                type="date"
                className="w-full md:w-auto px-4 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-transform transform active:scale-95">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900">Upcoming Events</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No events found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Link href={`/event/${event.id}`} key={event.id} className="group cursor-pointer">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col h-full">
                  <div className="h-40 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold opacity-90 group-hover:scale-105 transition-transform duration-500 origin-center">
                    {/* Placeholder for Event Image */}
                    {event.name.charAt(0)}
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                        {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                      </p>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {event.name}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {event.address}
                    </p>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-600">
                      <span>
                        {event.available_seats} seats left
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
