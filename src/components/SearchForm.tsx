"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || ''
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    
    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="max-w-4xl mx-auto bg-gray-100 p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-inner">
      <input
        type="text"
        placeholder="Search events, artists, venues..."
        className="flex-grow px-6 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
        value={filters.keyword}
        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
      />
      <div className="flex gap-2">
        <input
          type="date"
          className="w-full md:w-auto px-4 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
          value={filters.fromDate}
          onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
        />
        <input
          type="date"
          className="w-full md:w-auto px-4 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
          value={filters.toDate}
          onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
        />
      </div>
      <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-transform transform active:scale-95">
        Search
      </button>
    </form>
  );
}
