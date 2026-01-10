"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateEventPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        date: '',
        time: '',
        rows: 10,
        columns: 10
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        setCurrentUser(JSON.parse(userStr));
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Combine date and time
            const eventDate = new Date(`${formData.date}T${formData.time}`);

            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address,
                    event_date: eventDate.toISOString(),
                    rows: formData.rows,
                    columns: formData.columns,
                    organizer_id: currentUser.id
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Event Draft Created!');
                router.push('/organizer/dashboard');
            } else {
                alert(data.error || 'Failed to create event');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="font-bold text-xl text-gray-800 tracking-tight">TicketMaster <span className="text-blue-600">Pro</span></div>
                <div className="flex gap-4">
                    <Link href="/" className="text-gray-600 hover:text-gray-900 transition font-medium">Home</Link>
                    <Link href="/organizer/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">Dashboard</Link>
                </div>
            </nav>

            <div className="flex-grow container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                        <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
                        <p className="opacity-90">Set up your event details. It will confirm as DRAFT initially.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">

                        {/* Event Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                placeholder="e.g. Summer Music Festival 2026"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Venue Address</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                placeholder="e.g. Central Park, NY"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                <input
                                    type="date" required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                                <input
                                    type="time" required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Layout */}
                        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Rows</label>
                                <input
                                    type="number" min="1" max="50" required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                    value={formData.rows}
                                    onChange={e => setFormData({ ...formData, rows: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Columns (Seats per Row)</label>
                                <input
                                    type="number" min="1" max="50" required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                    value={formData.columns}
                                    onChange={e => setFormData({ ...formData, columns: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="col-span-2 text-center text-sm text-gray-500">
                                Total Capacity: <span className="font-bold text-gray-800">{formData.rows * formData.columns} Seats</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating Draft...' : 'Create Event Draft'}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}
