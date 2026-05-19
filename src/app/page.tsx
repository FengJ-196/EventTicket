import Link from 'next/link';
import { searchEvents } from '@/data-access/Event';
import Header from '@/components/Header';
import SearchForm from '@/components/SearchForm';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; fromDate?: string; toDate?: string }>;
}) {
  const params = await searchParams;
  
  // Convert string dates to Date objects for the data-access layer
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;

  // Fetch events directly from the database on the server
  const events = await searchEvents(params.keyword, fromDate, toDate);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />

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

          <SearchForm />
        </div>
      </section>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900">Upcoming Events</h3>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No events found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event: any) => (
              <Link href={`/event/${event.id}`} key={event.id} className="group cursor-pointer">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col h-full">
                  <div className="h-40 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold opacity-90 group-hover:scale-105 transition-transform duration-500 origin-center">
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
