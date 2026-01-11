"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Event {
    id: string;
    name: string;
    status: string; // DRAFT, PENDING, VERIFY, PUBLISHED
    event_date: string;
    address: string;
    available_seats: number;
    rows: number;
    columns: number;
}

export default function OrganizerDashboard() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        fetchEvents(user.id);
    }, [router]);

    const fetchEvents = async (organizerId: string) => {
        try {
            const res = await fetch(`/api/organizer/events?organizerId=${organizerId}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (eventId: string, newStatus: string) => {
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

        try {
            const res = await fetch(`/api/events/${eventId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();

            if (res.ok) {
                // Refresh list
                fetchEvents(currentUser.id);
            } else {
                alert(data.error || 'Failed to update status');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-200 text-gray-700';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'VERIFY': return 'bg-purple-100 text-purple-800';
            case 'PUBLISHED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100';
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="font-bold text-xl text-gray-800 tracking-tight">Organizer <span className="text-blue-600">Pro</span></div>
                <div className="flex gap-4 items-center">
                    <span className="text-sm text-gray-500">Welcome, {currentUser?.name}</span>
                    <Link href="/" className="text-gray-600 hover:text-gray-900 transition font-medium">Home</Link>
                    <button
                        onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}
                        className="text-red-500 hover:text-red-700 font-medium text-sm"
                    >Logout</button>
                </div>
            </nav>

            <div className="flex-grow container mx-auto px-4 py-12">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Your Events</h1>
                    <Link
                        href="/organizer/create"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition flex items-center gap-2"
                    >
                        + Create New Event
                    </Link>
                </div>

                <div className="grid gap-6">
                    {events.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-lg mb-4">You haven't created any events yet.</p>
                            <Link href="/organizer/create" className="text-blue-600 font-bold hover:underline">Get Started</Link>
                        </div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(event.status)}`}>
                                                {event.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-1">
                                            {new Date(event.event_date).toLocaleString()} • {event.address}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            Capacity: {event.rows * event.columns} • Available: {event.available_seats}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {(event.status === 'DRAFT' || event.status === 'PENDING') && (
                                            <Link
                                                href={`/organizer/edit/${event.id}`}
                                                className="text-gray-600 hover:text-blue-600 text-sm font-medium border px-3 py-2 rounded-lg hover:border-blue-600 transition"
                                            >
                                                Edit Event
                                            </Link>
                                        )}

                                        {(event.status === 'VERIFY' || event.status === 'PUBLISHED') && (
                                            <Link
                                                href={`/organizer/manage-seats/${event.id}`}
                                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-bold border border-indigo-200 px-3 py-2 rounded-lg transition"
                                            >
                                                Manage Seats
                                            </Link>
                                        )}

                                        {event.status === 'PUBLISHED' && (
                                            <Link
                                                href={`/event/${event.id}`}
                                                className="text-gray-600 hover:text-blue-600 text-sm font-medium border px-3 py-2 rounded-lg hover:border-blue-600 transition"
                                            >
                                                View Page
                                            </Link>
                                        )}

                                        {/* Status Actions */}
                                        {event.status === 'DRAFT' && (
                                            <button
                                                onClick={() => handleStatusChange(event.id, 'PENDING')}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                                            >
                                                Submit for Review
                                            </button>
                                        )}
                                        {/* PENDING events wait for Admin */}
                                        {event.status === 'PENDING' && (
                                            <span className="text-yellow-600 bg-yellow-100 px-3 py-2 rounded-lg text-sm font-bold">
                                                In Review
                                            </span>
                                        )}
                                        {event.status === 'VERIFY' && (
                                            <button
                                                onClick={() => handleStatusChange(event.id, 'PUBLISHED')}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                                            >
                                                Publish Event
                                            </button>
                                        )}
                                        {event.status === 'PUBLISHED' && (
                                            <button
                                                disabled
                                                className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-bold cursor-not-allowed"
                                            >
                                                Live
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
