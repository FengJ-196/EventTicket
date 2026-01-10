"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react'; // React 19 / Next.js 15
import Link from 'next/link';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // In Next.js 15, params is a Promise we must unwrap
    const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        params.then(setUnwrappedParams);
    }, [params]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        setCurrentUser(JSON.parse(userStr));
    }, [router]);

    useEffect(() => {
        if (unwrappedParams && currentUser) {
            fetchEventDetails(unwrappedParams.id);
        }
    }, [unwrappedParams, currentUser]);

    const fetchEventDetails = async (id: string) => {
        try {
            const res = await fetch(`/api/events/${id}`);
            if (res.ok) {
                const event = await res.json();

                // Parse date/time for form
                const dt = new Date(event.event_date);
                const dateStr = dt.toISOString().split('T')[0];
                const timeStr = dt.toTimeString().slice(0, 5);

                setFormData({
                    name: event.name,
                    address: event.address,
                    date: dateStr,
                    time: timeStr,
                    rows: event.rows,
                    columns: event.columns
                });
            } else {
                alert('Failed to load event');
                router.push('/organizer/dashboard');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (!unwrappedParams) return;

        try {
            const eventDate = new Date(`${formData.date}T${formData.time}`);

            const res = await fetch(`/api/events/${unwrappedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address,
                    event_date: eventDate.toISOString(),
                    rows: formData.rows,
                    columns: formData.columns,
                    // Re-calc available seats if rows/cols changed? 
                    // Usually dangerous if bookings exist, but for DRAFT it's fine.
                    // The backend `updateEvent` sets them blindly.
                    // Ideally we should reset available_seats = rows*columns if status is DRAFT.
                    available_seats: formData.rows * formData.columns
                })
            });

            if (res.ok) {
                alert('Event Updated!');
                router.push('/organizer/dashboard');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update event');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !currentUser) return <div className="p-10">Loading...</div>;

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
                        <h1 className="text-3xl font-bold mb-2">Edit Event</h1>
                        <p className="opacity-90">Update your event details. (Only for DRAFT events)</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Event Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
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
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Columns</label>
                                <input
                                    type="number" min="1" max="50" required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                                    value={formData.columns}
                                    onChange={e => setFormData({ ...formData, columns: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Link
                                href="/organizer/dashboard"
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl text-center transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-70"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
