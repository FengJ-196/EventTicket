"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CreditCard, Loader2 } from "lucide-react";

interface SeatType {
    id: string;
    name: string;
    price: number;
}

interface Seat {
    id: string;
    x_coordinate: number;
    y_coordinate: number;
    seat_type_id: string;
    status: string; // AVAILABLE, ON_HOLD, BOOKED, DISABLED
}

interface Event {
    rows?: number;
    columns?: number;
    Seats: Seat[];
    seatData: SeatType[];
}


export default function SeatMap({ event }: { event: Event }) {
    const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Helper to find seat at x,y
    const getSeat = (x: number, y: number) => {
        return event.Seats.find(s => s.x_coordinate === x && s.y_coordinate === y);
    };

    const getSeatType = (id: string) => {
        return event.seatData.find(st => st.id === id);
    };

    const toggleSeat = (seat: Seat) => {
        if (seat.status !== 'AVAILABLE') return;

        const newSelected = new Set(selectedSeatIds);
        if (newSelected.has(seat.id)) {
            newSelected.delete(seat.id);
        } else {
            newSelected.add(seat.id);
        }
        setSelectedSeatIds(newSelected);
    };

    const calculateTotal = () => {
        let total = 0;
        selectedSeatIds.forEach(id => {
            const seat = event.Seats.find(s => s.id === id);
            if (seat) {
                const type = getSeatType(seat.seat_type_id);
                if (type) total += Number(type.price);
            }
        });
        return total;
    };

    const handleBook = async (name: string) => {
        if (!name) {
            alert("Please enter your name");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seatIds: Array.from(selectedSeatIds),
                    userName: name,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Booking failed');
            }

            alert('Booking successful!');
            router.refresh();
            setSelectedSeatIds(new Set());
        } catch (e: any) {
            alert('Booking failed: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const rows = Array.from({ length: event.rows || 0 }, (_, i) => i + 1);
    const cols = Array.from({ length: event.columns || 0 }, (_, i) => i + 1);


    return (
        <div className="flex flex-col gap-8">
            {/* Screen/Stage Visual */}
            <div className="w-full flex flex-col items-center mb-4">
                <div className="w-3/4 h-4 bg-slate-300 rounded-lg mb-2 shadow-inner"></div>
                <span className="text-xs text-slate-400 uppercase tracking-widest">Stage</span>
            </div>

            <div className="grid gap-2 overflow-auto p-4 justify-center" style={{
                gridTemplateColumns: `repeat(${event.columns}, minmax(40px, 1fr))`
            }}>
                {rows.map(y => (
                    cols.map(x => { // Flatten map for grid
                        const seat = getSeat(x, y);
                        if (!seat) return <div key={`${x}-${y}`} className="w-10 h-10" />; // Empty space if no seat defined

                        const type = getSeatType(seat.seat_type_id);
                        const isSelected = selectedSeatIds.has(seat.id);
                        const isAvailable = seat.status === 'AVAILABLE';
                        const isDisabled = seat.status === 'DISABLED';
                        const isInteractable = isAvailable;

                        return (
                            <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat)}
                                disabled={!isInteractable}
                                className={clsx(
                                    "w-10 h-10 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center relative group",
                                    isInteractable ? (
                                        isSelected
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300 scale-105"
                                            : "bg-white border-2 border-slate-200 hover:border-indigo-400 text-slate-600 hover:bg-indigo-50"
                                    ) : (
                                        isDisabled
                                            ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700 opacity-50" // Disabled Style
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200" // Booked/Reserved Style
                                    )
                                )}
                                title={`Row ${y}, Col ${x} - ${type?.name} ($${type?.price})`}
                            >
                                {/* Tooltip or Label */}
                                {type?.name.substring(0, 1)}
                            </button>
                        );
                    })
                ))}
            </div>

            {/* Booking Footer */}
            <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-500">Selected Seats: <span className="font-medium text-slate-900">{selectedSeatIds.size}</span></p>
                    <p className="text-2xl font-bold text-slate-900">${calculateTotal().toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Enter your name"
                        className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        id="userNameInput"
                    />
                    <button
                        onClick={() => {
                            const nameInput = document.getElementById('userNameInput') as HTMLInputElement;
                            handleBook(nameInput.value);
                        }}
                        disabled={selectedSeatIds.size === 0 || loading}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                        Book Selected
                    </button>
                </div>
            </div>
        </div>
    );
}
