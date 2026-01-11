"use client";

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft,
    Plus,
    Save,
    Trash2,
    Grid2X2,
    Settings2,
    LayoutGrid,
    MousePointer2,
    CheckCircle2,
    Info,
    RefreshCcw,
    X,
    Target,
    Eraser,
    Mic2
} from 'lucide-react';
import clsx from 'clsx';

interface SeatType {
    id: string;
    name: string;
    price: number;
}

interface Seat {
    id: string;         // Seat GUID
    seat_id: string;    // Seat GUID (alias)
    x_coordinate: number;
    y_coordinate: number;
    seat_type_id: string;
    seat_type: string;  // Seat type name
    status: string;
    price: number;
}

export default function ManageSeatsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const eventId = params.id;

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [event, setEvent] = useState<any>(null);
    const [seatTypes, setSeatTypes] = useState<SeatType[]>([]);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [newSeatType, setNewSeatType] = useState({ name: '', price: 0 });
    const [rectangle, setRectangle] = useState({ x1: 1, y1: 1, x2: 1, y2: 1, seatTypeName: '' });
    const [editingSeatType, setEditingSeatType] = useState<SeatType | null>(null);

    // Selection Interactive States
    const [selectionStep, setSelectionStep] = useState<0 | 1 | 2>(0); // 0: none, 1: first picked, 2: range locked

    // Memoize the currently selected seat type for use in the map highlighting
    const selectedType = useMemo(() =>
        seatTypes.find(st => st.name === rectangle.seatTypeName),
        [seatTypes, rectangle.seatTypeName]);

    const isPublished = event?.status === 'PUBLISHED';

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }
        setCurrentUser(JSON.parse(userStr));
        fetchData(true); // Initial fetch with full loading
    }, [eventId, router]);

    const fetchData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const [eventRes, typesRes, seatsRes] = await Promise.all([
                fetch(`/api/events/${eventId}`),
                fetch(`/api/events/${eventId}/seat-types`),
                fetch(`/api/events/${eventId}/seats`)
            ]);

            if (eventRes.ok && typesRes.ok) {
                const eventData = await eventRes.json();
                const typesData = await typesRes.json();

                setEvent(eventData);
                setSeatTypes(typesData);

                if (seatsRes.ok) {
                    const seatsData = await seatsRes.json();
                    setSeats(seatsData);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const handleCreateSeatType = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}/seat-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSeatType)
            });
            if (res.ok) {
                setNewSeatType({ name: '', price: 0 });
                fetchData(false);
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to create seat type');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateSeatType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSeatType) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}/seat-types/${editingSeatType.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingSeatType.name, price: editingSeatType.price })
            });
            if (res.ok) {
                setEditingSeatType(null);
                fetchData(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSeatType = async (id: string, name: string) => {
        if (name === 'DEFAULT SEAT') {
            alert("Cannot delete default seat type");
            return;
        }
        if (!confirm('Are you sure? Seats assigned to this type will become inconsistent if not reassigned.')) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}/seat-types/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData(false);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignSeats = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rectangle.seatTypeName) {
            alert('Please select a seat type');
            return;
        }

        // Normalize coordinates for the API (must be x1 <= x2 and y1 <= y2)
        const normalizedRect = {
            seatTypeName: rectangle.seatTypeName,
            x1: Math.min(rectangle.x1, rectangle.x2),
            y1: Math.min(rectangle.y1, rectangle.y2),
            x2: Math.max(rectangle.x1, rectangle.x2),
            y2: Math.max(rectangle.y1, rectangle.y2)
        };

        setActionLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}/assign-seats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizedRect)
            });
            if (res.ok) {
                // Success - Reset selection and refresh data
                setSelectionStep(0);
                setRectangle(prev => ({ ...prev, x1: 1, y1: 1, x2: 1, y2: 1, seatTypeName: '' }));
                await fetchData(false);
                alert('Seats assigned successfully!');
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to assign seats');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSeatClick = (x: number, y: number) => {
        if (isPublished) return;
        if (selectionStep === 0 || selectionStep === 2) {
            // Start new selection
            setRectangle(prev => ({ ...prev, x1: x, y1: y, x2: x, y2: y }));
            setSelectionStep(1);
        } else {
            // Set second point
            setRectangle(prev => ({ ...prev, x2: x, y2: y }));
            setSelectionStep(2);
        }
    };

    // Use name for hashing to match user expectation of "random frontend color"
    const getHashColor = (str: string, type: 'bg' | 'border' | 'text' = 'text') => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Use Golden Angle (137.5 deg) for maximally distinct hue distribution
        const h = (Math.abs(hash) * 137.5) % 360;

        if (type === 'bg') return `hsl(${h}, 85%, 90%)`;
        if (type === 'border') return `hsl(${h}, 70%, 75%)`;
        return `hsl(${h}, 80%, 25%)`;
    };

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

    const isInsideCurrentRect = (x: number, y: number) => {
        const { x1, y1, x2, y2 } = rectangle;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };

    if (loading || !currentUser) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <RefreshCcw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/organizer/dashboard"
                            className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">{event?.name}</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Layout Management</span>
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200">
                                    {event?.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push(`/organizer/edit/${eventId}`)}
                        disabled={isPublished}
                        className={clsx(
                            "text-sm font-semibold px-4 py-2.5 rounded-xl transition-all border",
                            isPublished
                                ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                                : "text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100"
                        )}
                    >
                        Edit Layout Dimensions
                    </button>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-6 py-10 grid grid-cols-12 gap-8">

                {/* Left Sidebar: Controls */}
                <aside className="col-span-12 lg:col-span-4 space-y-8">

                    {isPublished && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                            <div className="p-2 bg-amber-100 rounded-lg h-fit text-amber-600">
                                <Info className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-amber-900">Event is Live</h3>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    This event is already published. Seat types and pricing tiers cannot be modified to protect existing bookings.
                                </p>
                            </div>
                        </div>
                    )}


                    {/* Seat Types Section */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden relative">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Settings2 className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold">Price Tiers</h2>
                            </div>
                        </div>

                        {/* List Seat Types */}
                        <div className="space-y-3 mb-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {seatTypes.map(st => (
                                <div
                                    key={st.id}
                                    className={clsx(
                                        "p-4 rounded-2xl border transition-all duration-300 group",
                                        editingSeatType?.id === st.id
                                            ? "border-blue-400 bg-blue-50/50 ring-4 ring-blue-50"
                                            : "border-slate-100 bg-slate-50 hover:border-slate-300"
                                    )}
                                    style={editingSeatType?.id !== st.id ? {
                                        borderLeft: `5px solid ${getHashColor(st.name, 'border')}`
                                    } : {}}
                                >
                                    {editingSeatType?.id === st.id ? (
                                        <form onSubmit={handleUpdateSeatType} className="space-y-3">
                                            <input
                                                className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                value={editingSeatType.name}
                                                onChange={e => setEditingSeatType({ ...editingSeatType, name: e.target.value })}
                                                placeholder="Name"
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-grow">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                    <input
                                                        type="number" step="0.01"
                                                        className="w-full pl-6 pr-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                                        value={editingSeatType.price}
                                                        onChange={e => setEditingSeatType({ ...editingSeatType, price: parseFloat(e.target.value) })}
                                                        placeholder="Price"
                                                    />
                                                </div>
                                                <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>
                                                <button type="button" onClick={() => setEditingSeatType(null)} className="text-slate-400 hover:text-slate-600">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="block font-bold text-slate-800 text-sm">{st.name}</span>
                                                <span className="text-sm font-bold text-indigo-600">${st.price.toFixed(2)}</span>
                                            </div>
                                            {!isPublished && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingSeatType(st)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                                    >
                                                        <Settings2 className="w-4 h-4" />
                                                    </button>
                                                    {st.name !== 'DEFAULT SEAT' && (
                                                        <button
                                                            onClick={() => handleDeleteSeatType(st.id, st.name)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add New Seat Type */}
                        {!isPublished && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Create New Tier</h3>
                                <form onSubmit={handleCreateSeatType} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-300 focus:ring-0 text-sm outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Tier Name (e.g. VIP)"
                                            required
                                            value={newSeatType.name}
                                            onChange={e => setNewSeatType({ ...newSeatType, name: e.target.value })}
                                        />
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full pl-6 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-300 focus:ring-0 text-sm outline-none transition-all font-bold"
                                                placeholder="Price"
                                                required
                                                value={newSeatType.price}
                                                onChange={e => setNewSeatType({ ...newSeatType, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        <Plus className="w-5 h-5" /> Add Price Tier
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Visual Assignment Guide */}
                    <div className={clsx(
                        "bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden transition-opacity",
                        isPublished && "opacity-50 pointer-events-none grayscale-[0.5]"
                    )}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                                <Target className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold">Interactive Selection</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center text-center gap-2">
                                {selectionStep === 0 ? (
                                    <>
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 animate-pulse border border-slate-200">
                                            <MousePointer2 className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">Pick the first seat on the map</p>
                                    </>
                                ) : selectionStep === 1 ? (
                                    <>
                                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white scale-110 shadow-lg shadow-indigo-100">
                                            <Target className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-black text-indigo-600">Point 1: Row {getRowLabel(rectangle.y1)}, Col {rectangle.x1}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Now pick the opposite corner</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                                            <Grid2X2 className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-black text-green-600">Range Target Set!</p>
                                        <div className="flex gap-4 mt-1">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{getRowLabel(rectangle.y1)}{rectangle.x1}</span>
                                            <span className="text-[10px] text-slate-300 font-bold">to</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{getRowLabel(rectangle.y2)}{rectangle.x2}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <form onSubmit={handleAssignSeats} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Price Tier to Apply</label>
                                    <select
                                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-400 focus:ring-0 text-sm outline-none font-bold appearance-none transition-all"
                                        required
                                        value={rectangle.seatTypeName}
                                        onChange={e => setRectangle({ ...rectangle, seatTypeName: e.target.value })}
                                    >
                                        <option value="">Choose Price Tier...</option>
                                        {seatTypes.map(st => (
                                            <option key={st.id} value={st.name}>{st.name} — ${st.price.toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectionStep(0);
                                            setRectangle(r => ({ ...r, x1: 1, y1: 1, x2: 1, y2: 1 }));
                                        }}
                                        className="px-4 py-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                                        title="Reset Selection"
                                    >
                                        <Eraser className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading || selectionStep !== 2}
                                        className="flex-grow bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:grayscale"
                                    >
                                        <Save className="w-5 h-5" /> Apply Pricing
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </aside>

                {/* Right Sidebar: Map View */}
                <section className="col-span-12 lg:col-span-8">
                    <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-slate-100 min-h-[750px] flex flex-col items-center relative overflow-hidden">

                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>

                        <div className="flex items-center gap-4 mb-20 self-start">
                            <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100/50">
                                <Grid2X2 className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-[900] text-slate-900 leading-none mb-1.5">Interactive Seating Design</h2>
                                <p className="text-sm font-medium text-slate-400">Manage venue layout and pricing tiers</p>
                            </div>
                        </div>

                        {/* Stage Visual */}
                        <div className="w-full max-w-2xl mb-24 relative flex flex-col items-center">
                            <div className="w-full h-4 bg-slate-100 rounded-full border border-slate-200 shadow-inner flex items-center justify-center">
                                <Mic2 className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="absolute -top-12 text-[11px] font-[900] uppercase tracking-[0.5em] text-slate-300 bg-white px-10">
                                THE STAGE
                            </div>
                        </div>

                        {/* Seat Grid with Axis Headers */}
                        {event && (
                            <div className="relative inline-block overflow-visible mt-10">
                                {/* Column Headers (Numbers) */}
                                <div
                                    className="grid mb-4"
                                    style={{
                                        gridTemplateColumns: `repeat(${event.columns}, minmax(32px, 1fr))`,
                                        gap: '10px',
                                        paddingLeft: '40px' // Offset for row labels
                                    }}
                                >
                                    {Array.from({ length: event.columns }, (_, i) => (
                                        <div key={i} className="text-[10px] font-black text-slate-300 text-center uppercase tracking-tighter">
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex">
                                    {/* Row Headers (Letters) */}
                                    <div
                                        className="grid mr-4"
                                        style={{
                                            gridTemplateRows: `repeat(${event.rows}, 32px)`,
                                            gap: '10px'
                                        }}
                                    >
                                        {Array.from({ length: event.rows }, (_, i) => (
                                            <div key={i} className="h-8 flex items-center justify-end text-[10px] font-black text-slate-300 pr-2 uppercase">
                                                {getRowLabel(i + 1)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actual Seat Grid */}
                                    <div
                                        className="grid p-6 rounded-[2rem] bg-slate-100/30 border border-slate-200 shadow-inner"
                                        style={{
                                            gridTemplateColumns: `repeat(${event.columns}, minmax(32px, 1fr))`,
                                            gap: '10px'
                                        }}
                                    >
                                        {Array.from({ length: event.rows }, (_, yIdx) => {
                                            const y = yIdx + 1;
                                            return Array.from({ length: event.columns }, (_, xIdx) => {
                                                const x = xIdx + 1;
                                                const seatWithData = seats.find(s => s.x_coordinate === x && s.y_coordinate === y);

                                                // Priority: Match by seat_type name if provided by API, otherwise search by id
                                                const seatTypeName = seatWithData?.seat_type;
                                                const type = seatTypeName ?
                                                    seatTypes.find(st => st.name === seatTypeName) :
                                                    (seatWithData?.seat_type_id ? seatTypes.find(st => st.id.toLowerCase() === seatWithData.seat_type_id.toLowerCase()) : null);

                                                const isHighlighted = isInsideCurrentRect(x, y);
                                                const isPoint1 = rectangle.x1 === x && rectangle.y1 === y && selectionStep >= 1;
                                                const isPoint2 = rectangle.x2 === x && rectangle.y2 === y && selectionStep >= 2;

                                                const displayColorBase = type ? type.name : (isHighlighted && selectedType ? selectedType.name : null);

                                                return (
                                                    <button
                                                        key={`${x}-${y}`}
                                                        onClick={() => handleSeatClick(x, y)}
                                                        className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all duration-300 transform outline-none",
                                                            isPublished ? "cursor-default" : "cursor-pointer",
                                                            isHighlighted
                                                                ? "scale-110 z-10 shadow-lg ring-2 ring-white"
                                                                : !isPublished && "hover:scale-115 hover:shadow-md",
                                                            displayColorBase ? "bg-white border" : "bg-slate-200",
                                                            (isPoint1 || isPoint2) && "ring-4 ring-indigo-400 ring-offset-2 z-20 scale-125 bg-pink-500 text-white border-none"
                                                        )}
                                                        style={{
                                                            ...(displayColorBase && !isHighlighted ? {
                                                                backgroundColor: getHashColor(displayColorBase, 'bg'),
                                                                borderColor: getHashColor(displayColorBase, 'border'),
                                                                color: getHashColor(displayColorBase, 'text'),
                                                                borderWidth: '2px'
                                                            } : {}),
                                                            ...(isHighlighted ? {
                                                                backgroundColor: selectedType ? getHashColor(selectedType.name, 'bg') : '#6366f1',
                                                                borderColor: selectedType ? getHashColor(selectedType.name, 'border') : '#4f46e5',
                                                                color: selectedType ? getHashColor(selectedType.name, 'text') : '#fff',
                                                                borderWidth: '2px',
                                                                opacity: 0.95
                                                            } : {}),
                                                            ...(!displayColorBase && !isHighlighted ? {
                                                                borderColor: '#e2e8f0',
                                                                borderWidth: '1px'
                                                            } : {})
                                                        }}
                                                        title={`Row ${getRowLabel(y)}, Col ${x}: ${type?.name || 'Empty'} ($${type?.price || 0})`}
                                                    >
                                                        {type?.name.substring(0, 1) || ''}
                                                    </button>
                                                );
                                            });
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Legend */}
                        <div className="mt-20 self-start w-full bg-slate-50/50 p-10 rounded-[2rem] border border-slate-100">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 border-b border-slate-200 pb-4">Seating Palette & Pricing</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {seatTypes.map(st => (
                                    <div key={st.id} className="flex items-center gap-4 group">
                                        <div
                                            className="w-6 h-6 rounded-lg border-2 shadow-sm transition-transform group-hover:scale-110"
                                            style={{
                                                borderColor: getHashColor(st.name, 'border'),
                                                backgroundColor: getHashColor(st.name, 'bg')
                                            }}
                                        ></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-700 leading-tight">{st.name}</span>
                                            <span className="text-[10px] font-bold text-indigo-500">${st.price.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
