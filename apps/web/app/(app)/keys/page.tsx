'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { KeyManager } from '@/components/app/key-manager';
import { api } from '@/lib/api';

export default function KeysPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    if (!token) return;
    
    try {
      const data: any = await api.getServiceAccounts(token);
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Failed to load service accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading service accounts...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Service Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Google Service Account keys for the Indexing API
        </p>
      </div>
      <KeyManager accounts={accounts} token={token} onUpdate={loadAccounts} />
    </div>
  );
}
