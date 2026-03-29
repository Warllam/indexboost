'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryTable } from '@/components/app/history-table';
import { api } from '@/lib/api';

export default function HistoryPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadHistory = async (pageNum: number = 1) => {
    if (!token) return;
    
    try {
      const data: any = await api.getHistory(token, { page: pageNum, limit: 50 });
      if (pageNum === 1) {
        setEntries(data.entries || []);
      } else {
        setEntries((prev) => [...prev, ...(data.entries || [])]);
      }
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [token]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadHistory(nextPage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submission History</h1>
        <p className="text-muted-foreground mt-2">
          View all your URL submissions and their status
        </p>
      </div>
      <HistoryTable entries={entries} onLoadMore={handleLoadMore} hasMore={hasMore} />
    </div>
  );
}
