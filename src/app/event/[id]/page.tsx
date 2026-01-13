"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


interface Event {
    id: string;
    name: string;
    address: string;
    event_date: string;
    organizer_name: string;
    available_seats: number;
}

interface Seat {
    seat_id: string;
    x_coordinate: number;
    y_coordinate: number;
    status: string; // 'AVAILABLE', 'BOOKED', 'ON_HOLD'
    seat_type: string;
    price: number;
    user_id?: string;
    hold_expires_at?: string;
}


export default function EventDetails({ params }: { params: { id: string } }) {
    const [event, setEvent] = useState<Event | null>(null);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [seatTypes, setSeatTypes] = useState<any[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Grid Dimensions
    const [maxX, setMaxX] = useState(0);
    const [maxY, setMaxY] = useState(0);

    // In Next.js 15+, params is a Promise. We should unwrap it.
    // However, since this is a client component, strictly speaking we might want to use `use` from React or just await it if it was a server component.
    // For simplicity in a client component, we'll assume we can treat it as object or use state to unwrap if necessary.
    // But to be safe and avoid "Promise" access warnings:
    const [eventId, setEventId] = useState<string>('');

    useEffect(() => {
        // Unwrap params if it's a promise, or just use it. 
        // We'll treat it as standard object for now to support older Next versions too, 
        // but if it's Next 15 we might need `React.use(params)`. 
        // Given complexity, let's just assume we can read .id for now or simply Wrap use effect.
        // Actually, easiest way compatible with both:
        Promise.resolve(params).then(p => setEventId(p.id));
    }, [params]);

    useEffect(() => {
        if (!eventId) return;

        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        const fetchEventAndSeats = async () => {
            try {
                // Fetch Event Details
                const eventRes = await fetch(`/api/events/${eventId}`);
                if (!eventRes.ok) {
                    if (eventRes.status === 404) { alert('Event not found'); router.push('/'); return; }
                    throw new Error('Failed to fetch event');
                }
                const eventData = await eventRes.json();
                setEvent(eventData);

                // Fetch Seats
                const seatRes = await fetch(`/api/events/${eventId}/seats`);
                const seatData = await seatRes.json();
                setSeats(seatData);

                // Fetch Seat Types for Legend
                const typesRes = await fetch(`/api/events/${eventId}/seat-types`);
                if (typesRes.ok) {
                    const typesData = await typesRes.json();
                    setSeatTypes(typesData);
                }

                // Calculate grid
                if (seatData.length > 0) {
                    setMaxX(Math.max(...seatData.map((s: Seat) => s.x_coordinate)));
                    setMaxY(Math.max(...seatData.map((s: Seat) => s.y_coordinate)));
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEventAndSeats();
    }, [eventId, router]);

    const handleSeatClick = (seat: Seat) => {
        if (!currentUser) {
            alert('Please login to book seats');
            router.push('/login');
            return;
        }
        if (seat.status !== 'AVAILABLE') return;

        if (selectedSeats.includes(seat.seat_id)) {
            setSelectedSeats(selectedSeats.filter(id => id !== seat.seat_id));
        } else {
            setSelectedSeats([...selectedSeats, seat.seat_id]);
        }
    };

    const handleHoldSeats = async () => {
        if (!currentUser) return;

        try {
            const res = await fetch('/api/bookings/hold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    seatIds: selectedSeats
                })
            });
            const data = await res.json();

            if (res.ok) {
                alert('Seats held! You have 30 seconds to pay.');
                window.location.reload();
            } else if (res.status === 409 && data.unavailableSeatIds) {
                const contestedSeats = seats.filter(s => data.unavailableSeatIds.includes(s.seat_id));
                const seatLabels = contestedSeats.map(s => `Row ${getRowLabel(s.x_coordinate)}, Seat ${s.y_coordinate}`).join('\n');

                alert(`Conflict Detected:\n\nThe following seats were just taken by someone else:\n\n${seatLabels}\n\nThey have been removed from your selection.`);

                setSelectedSeats(selectedSeats.filter(id => !data.unavailableSeatIds.includes(id)));

                const seatRes = await fetch(`/api/events/${eventId}/seats`);
                if (seatRes.ok) {
                    const freshSeats = await seatRes.json();
                    setSeats(freshSeats);
                }
            } else {
                alert(data.error || 'Failed to hold seats');
            }
        } catch (err) {
            console.error(err);
            alert('An unexpected error occurred.');
        }
    };

    const myHeldSeats = seats.filter(s => s.status === 'ON_HOLD' && currentUser && s.user_id === currentUser.id);
    const myHeldPrice = myHeldSeats.reduce((sum, s) => sum + s.price, 0);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const timer = setInterval(() => {
            if (myHeldSeats.length > 0) {
                const earliestExpiry = Math.min(...myHeldSeats.map(s => s.hold_expires_at ? new Date(s.hold_expires_at).getTime() : Infinity));
                if (earliestExpiry === Infinity) {
                    setTimeLeft(null);
                    return;
                }
                const now = new Date().getTime();
                const diff = Math.floor((earliestExpiry - now) / 1000);
                if (diff <= 0) {
                    clearInterval(timer);
                    setTimeLeft(0);
                    alert('Your session has expired. The seats have been released.');
                    setSelectedSeats([]);
                    window.location.reload();
                } else {
                    setTimeLeft(diff);
                }
            } else {
                setTimeLeft(null);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [myHeldSeats]);

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!event) return <div className="p-10 text-center">Event not found</div>;

    const totalPrice = seats
        .filter(s => selectedSeats.includes(s.seat_id))
        .reduce((sum, s) => sum + s.price, 0);

    const getRowLabel = (y: number) => {
        let label = '';
        let num = y;
        while (num > 0) {
            let rem = (num - 1) % 26;
            label = String.fromCharCode(65 + rem) + label;
            num = Math.floor((num - 1) / 26);
        }
        return label;
    };

    const handleConfirmPurchase = async () => {
        if (!currentUser || myHeldSeats.length === 0) return;
        try {
            const res = await fetch('/api/bookings/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    seatIds: myHeldSeats.map(s => s.seat_id),
                    amount: myHeldPrice
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Purchase successful! Tickets sent.');
                window.location.reload();
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };


    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Link href="/" className="text-blue-600 mb-4 inline-block hover:underline">&larr; Back to Events</Link>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Event Info */}
                    <div className="lg:w-1/3 space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
                            <p className="text-gray-500">{new Date(event.event_date).toLocaleString()}</p>
                            <p className="text-gray-900 font-medium mt-2">{event.address}</p>
                            <p className="text-sm text-gray-400 mt-1">Organizer: {event.organizer_name}</p>
                        </div>

                        {/* Pending Payment Section */}
                        {myHeldSeats.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-sm animate-pulse">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-yellow-800">Complete Your Order</h3>
                                    {timeLeft !== null && (
                                        <div className="bg-yellow-800 text-white px-3 py-1 rounded-full text-sm font-mono flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            {formatTime(timeLeft)}
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-yellow-700 mb-4">You have {myHeldSeats.length} seats reserved. Pay now to secure them.</p>
                                <div className="space-y-1 mb-4">
                                    {myHeldSeats.map(s => (
                                        <div key={s.seat_id} className="text-sm flex justify-between">
                                            <span>Row {s.y_coordinate}, Col {s.x_coordinate}</span>
                                            <span>${s.price}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-yellow-200 pt-2 font-bold flex justify-between">
                                        <span>Total Due</span>
                                        <span>${myHeldPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleConfirmPurchase}
                                    className="w-full bg-yellow-600 text-white py-3 rounded-xl font-bold hover:bg-yellow-700 transition"
                                >
                                    Confirm Purchase ${myHeldPrice.toFixed(2)}
                                </button>
                            </div>
                        )}

                        <div className="bg-white border rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 text-gray-900">Selection</h3>
                            {selectedSeats.length === 0 ? (
                                <p className="text-gray-600 text-sm">Select available (green) seats on the map.</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {seats.filter(s => selectedSeats.includes(s.seat_id)).map(s => (
                                            <div key={s.seat_id} className="flex justify-between text-sm text-gray-700">
                                                <span>Row {s.y_coordinate}, Col {s.x_coordinate} ({s.seat_type})</span>
                                                <span>${s.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t pt-4 flex justify-between font-bold">
                                        <span>Estimated Total</span>
                                        <span>${totalPrice.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={handleHoldSeats}
                                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                                    >
                                        Hold Selected Seats
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pricing & Status</h4>
                            <div className="flex gap-4 text-sm flex-wrap text-gray-700 font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500"></div> Available</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-600"></div> Selected</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400"></div> Your Hold</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-400"></div> Taken</div>

                                {/* Dynamic Price Tiers */}
                                {seatTypes.map(st => {
                                    return (
                                        <div key={st.id} className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500">
                                                {st.name.substring(0, 1)}
                                            </div>
                                            {st.name === 'DEFAULT SEAT' ? 'Normal' : st.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Stage & Seat Map */}
                    <div className="lg:w-2/3">
                        <div className="w-full bg-gray-200 h-12 mb-8 rounded-lg flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest">
                            Stage
                        </div>

                        <div className="overflow-x-auto pb-4">
                            <div className="relative inline-block mx-auto mt-4">
                                {/* Column Headers (Numbers) */}
                                <div
                                    className="grid mb-3"
                                    style={{
                                        gridTemplateColumns: `repeat(${maxX}, 40px)`,
                                        gap: '8px',
                                        paddingLeft: '48px' // Offset for row labels
                                    }}
                                >
                                    {Array.from({ length: maxX }, (_, i) => (
                                        <div key={i} className="text-[10px] font-black text-gray-300 text-center uppercase tracking-tighter">
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex">
                                    {/* Row Headers (Letters) */}
                                    <div
                                        className="grid mr-2"
                                        style={{
                                            gridTemplateRows: `repeat(${maxY}, 40px)`,
                                            gap: '8px'
                                        }}
                                    >
                                        {Array.from({ length: maxY }, (_, i) => (
                                            <div key={i} className="w-10 flex items-center justify-end text-[10px] font-black text-gray-300 pr-2 uppercase">
                                                {getRowLabel(i + 1)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actual Seat Grid */}
                                    <div
                                        className="grid gap-2"
                                        style={{
                                            gridTemplateColumns: `repeat(${maxX}, 40px)`,
                                            width: 'fit-content'
                                        }}
                                    >
                                        {Array.from({ length: maxY }).map((_, rIndex) => {
                                            const rowNum = rIndex + 1;
                                            return Array.from({ length: maxX }).map((_, cIndex) => {
                                                const colNum = cIndex + 1;
                                                const seat = seats.find(s => s.x_coordinate === colNum && s.y_coordinate === rowNum);

                                                if (!seat) return <div key={`${rowNum}-${colNum}`} className="w-10 h-10"></div>;

                                                const isSelected = selectedSeats.includes(seat.seat_id);
                                                const isMyHold = seat.status === 'ON_HOLD' && currentUser && seat.user_id === currentUser.id;
                                                const isAvailable = seat.status === 'AVAILABLE';

                                                let bgClass = "bg-gray-300 cursor-not-allowed"; // Default Taken
                                                if (isAvailable) {
                                                    bgClass = "bg-green-500 hover:bg-green-600 cursor-pointer text-white";
                                                }
                                                if (isSelected) {
                                                    bgClass = "bg-blue-600 ring-2 ring-blue-300 transform scale-105 text-white z-10";
                                                }
                                                if (isMyHold) {
                                                    bgClass = "bg-yellow-400 cursor-pointer ring-2 ring-yellow-200 text-white z-10"; // My hold
                                                }
                                                if (seat.status === 'BOOKED') bgClass = "bg-red-400 cursor-not-allowed text-white";

                                                // If someone else holds it
                                                if (seat.status === 'ON_HOLD' && !isMyHold) bgClass = "bg-gray-400 cursor-not-allowed opacity-50 text-white";

                                                return (
                                                    <div
                                                        key={seat.seat_id}
                                                        onClick={() => handleSeatClick(seat)}
                                                        className={`
                                                            w-10 h-10 rounded-t-lg rounded-b-md flex items-center justify-center text-xs font-bold transition-all shadow-sm
                                                            ${bgClass}
                                                        `}
                                                        title={`Row ${getRowLabel(rowNum)}, Col ${colNum} - ${seat.seat_type} ($${seat.price}) ${isMyHold ? '(Reserved by you)' : ''}`}
                                                    >
                                                        {seat.seat_type.substring(0, 1)}
                                                    </div>
                                                );
                                            });
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
