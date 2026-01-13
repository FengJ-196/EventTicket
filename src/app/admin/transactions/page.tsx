'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Transaction {
    id: string;
    action: string;
    created_at: string;
    user_name: string;
    user_username: string;
    event_name: string;
    x_coordinate: number;
    y_coordinate: number;
    ticket_id?: string | null;
}

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/transactions')
            .then(res => res.json())
            .then(data => {
                setTransactions(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'BOOK': return 'text-green-600 bg-green-100';
            case 'CANCEL': return 'text-red-600 bg-red-100';
            case 'ON_HOLD': return 'text-blue-600 bg-blue-100';
            case 'EXPIRE': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Seat Transactions</h1>
                        <p className="text-gray-400 mt-2 italic text-sm font-medium">Real-time audit log of all ticketing activities</p>
                    </div>
                    <Link
                        href="/admin/dashboard"
                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors shadow-lg text-sm font-bold"
                    >
                        &larr; Back to Dashboard
                    </Link>
                </div>

                <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Event</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Seat</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Ticket ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">Loading activity...</td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">No transactions found</td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                                {new Date(tx.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getActionColor(tx.action)}`}>
                                                    {tx.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{tx.user_name}</span>
                                                    <span className="text-xs text-gray-500 font-medium">@{tx.user_username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300 font-medium">
                                                {tx.event_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-red-400">
                                                B{tx.y_coordinate} - S{tx.x_coordinate}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                                {tx.ticket_id ? tx.ticket_id.slice(0, 8) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
