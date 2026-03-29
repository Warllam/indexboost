'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface HistoryEntry {
  id: string;
  url: string;
  googleStatus: 'success' | 'failed' | 'pending';
  indexnowStatus?: 'success' | 'failed';
  createdAt: string;
}

interface HistoryTableProps {
  entries: HistoryEntry[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function HistoryTable({ entries, onLoadMore, hasMore }: HistoryTableProps) {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const filteredEntries = entries.filter((entry) => {
    if (filter === 'all') return true;
    return entry.googleStatus === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Submission History</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'success' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('success')}
            >
              Success
            </Button>
            <Button
              variant={filter === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('failed')}
            >
              Failed
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Google</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">IndexNow</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="max-w-md truncate font-mono text-xs">{entry.url}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(entry.googleStatus)}
                          {getStatusBadge(entry.googleStatus)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {entry.indexnowStatus ? (
                          <div className="flex items-center gap-2">
                            {getStatusIcon(entry.indexnowStatus)}
                            {getStatusBadge(entry.indexnowStatus)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {hasMore && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
