"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Event {
    id: string;
    name: string;
    status: string;
    event_date: string;
    address: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(userStr);
        if (user.role !== 'ADMIN') {
            alert('Access Denied: Admins only');
            router.push('/');
            return;
        }

        fetchPendingEvents();
    }, [router]);

    const fetchPendingEvents = async () => {
        try {
            const res = await fetch('/api/admin/events');
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

    const handleAction = async (eventId: string, action: 'VERIFY' | 'DRAFT') => {
        const confirmMsg = action === 'VERIFY'
            ? 'Approve this event? (Seats will be generated)'
            : 'Deny this event? (Will return to Draft)';

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/events/${eventId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action })
            });

            if (res.ok) {
                alert(action === 'VERIFY' ? 'Event Verified!' : 'Event Denied');
                fetchPendingEvents();
            } else {
                alert('Action failed');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Admin Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
            <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
                <div className="font-bold text-xl tracking-tight">System<span className="text-red-500">Admin</span></div>
                <div className="flex gap-4 items-center">
                    <Link href="/" className="text-gray-300 hover:text-white transition font-medium">Home</Link>
                    <button
                        onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}
                        className="text-red-400 hover:text-red-300 font-medium text-sm ml-4"
                    >Logout</button>
                </div>
            </nav>

            <div className="flex-grow container mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8">Pending Approvals</h1>

                {events.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800 rounded-2xl shadow-sm border border-gray-700">
                        <p className="text-gray-400 text-lg">No events waiting for review.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map(event => (
                            <div key={event.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{event.name}</h2>
                                    <p className="text-gray-400">{new Date(event.event_date).toLocaleString()} | {event.address}</p>
                                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-900 text-yellow-200 text-xs rounded font-bold">
                                        NEEDS REVIEW
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAction(event.id, 'DRAFT')}
                                        className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold transition"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        onClick={() => handleAction(event.id, 'VERIFY')}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition"
                                    >
                                        Verify
                                    </button>
                                    <Link
                                        href={`/event/${event.id}`}
                                        target="_blank"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
