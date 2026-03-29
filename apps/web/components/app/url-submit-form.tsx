'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface SubmitResult {
  url: string;
  status: 'success' | 'failed';
  message?: string;
}

export function UrlSubmitForm({ token }: { token: string }) {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SubmitResult[]>([]);

  const urlCount = urls.split('\n').filter((line) => line.trim()).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    const urlList = urls
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    try {
      const response: any = await api.submitUrls(urlList, token);
      setResults(response.results || []);
    } catch (error: any) {
      alert(error.message || 'Failed to submit URLs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit URLs for Indexing</CardTitle>
          <CardDescription>
            Paste your URLs below, one per line. They will be submitted to Google's Indexing API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Textarea
                placeholder="https://example.com/page-1&#10;https://example.com/page-2&#10;https://example.com/page-3"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{urlCount} URL{urlCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading || urlCount === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Indexing...
                </>
              ) : (
                'Index Now'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submission Results</CardTitle>
            <div className="flex gap-4 text-sm">
              <span className="text-green-500">
                {results.filter((r) => r.status === 'success').length} successful
              </span>
              <span className="text-red-500">
                {results.filter((r) => r.status === 'failed').length} failed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  {result.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono text-xs">{result.url}</p>
                    {result.message && (
                      <p className="mt-1 text-muted-foreground">{result.message}</p>
                    )}
                  </div>
                  <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
