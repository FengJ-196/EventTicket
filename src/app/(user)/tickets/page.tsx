"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Ticket {
    payment_id: string;
    ticket_id: string;
    event_name: string;
    event_date: string;
    seat_id: string;
    x_coordinate: number; // Row
    y_coordinate: number; // Col
    seat_type: string;
    price: number;
    seat_status: string;
    status: string;
    payment_date: string;
}

export default function MyTicketsPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        fetchTickets(user.id);
    }, [router]);

    const fetchTickets = async (userId: string) => {
        try {
            const res = await fetch(`/api/users/${userId}/tickets`);
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async (ticketId: string) => {
        if (!confirm('Are you sure you want to refund this ticket? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/tickets/${ticketId}/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Refund successful!');
                fetchTickets(currentUser.id);
            } else {
                alert(data.error || 'Refund failed');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    if (loading) return <div className="p-10 text-center">Loading tickets...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="font-bold text-xl text-gray-800 tracking-tight">TicketMaster</div>
                <div className="flex gap-4 items-center">
                    <Link href="/" className="text-gray-600 hover:text-gray-900 transition font-medium">Home</Link>
                    <span className="text-blue-600 font-bold border-b-2 border-blue-600">My Tickets</span>
                    <button
                        onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}
                        className="text-red-500 hover:text-red-700 font-medium text-sm ml-4"
                    >Logout</button>
                </div>
            </nav>

            <div className="flex-grow container mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Tickets</h1>

                {tickets.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-lg mb-4">You haven't purchased any tickets yet.</p>
                        <Link href="/" className="text-blue-600 font-bold hover:underline">Browse Events</Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {tickets.map((ticket, index) => (
                            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                                    <h2 className="font-bold text-lg truncate">{ticket.event_name}</h2>
                                    <p className="text-sm opacity-90">{new Date(ticket.event_date).toLocaleString()}</p>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Row</p>
                                            <p className="text-xl font-bold text-gray-800">{ticket.x_coordinate}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Seat</p>
                                            <p className="text-xl font-bold text-gray-800">{ticket.y_coordinate}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Price</p>
                                            <p className="text-xl font-bold text-green-600">${ticket.price}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${ticket.status === 'VALID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {ticket.status === 'VALID' ? 'PAID' : 'REFUNDED'}
                                        </span>
                                        <span className="text-gray-400 text-xs">Purchased: {new Date(ticket.payment_date).toLocaleDateString()}</span>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-400">ID: {ticket.seat_id.slice(0, 8)}...</span>
                                            <div className="flex gap-2">
                                                {ticket.status === 'VALID' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleRefund(ticket.ticket_id)}
                                                            className="text-red-500 text-sm font-bold hover:underline px-2"
                                                        >
                                                            Refund
                                                        </button>
                                                        <button className="text-blue-600 text-sm font-bold hover:underline">Print Ticket</button>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic px-2">No actions available</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
