'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Key } from 'lucide-react';
import { api } from '@/lib/api';

interface ServiceAccount {
  id: string;
  name: string;
  email: string;
  quotaUsed: number;
  quotaLimit: number;
  createdAt: string;
}

interface KeyManagerProps {
  accounts: ServiceAccount[];
  token: string;
  onUpdate: () => void;
}

export function KeyManager({ accounts, token, onUpdate }: KeyManagerProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const jsonKey = JSON.parse(text);
      await api.addServiceAccount(jsonKey, token);
      onUpdate();
      alert('Service account added successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to add service account');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service account?')) return;

    try {
      await api.deleteServiceAccount(id, token);
      onUpdate();
      alert('Service account deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to delete service account');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Accounts</CardTitle>
            <CardDescription>
              Manage your Google Service Account keys for indexing
            </CardDescription>
          </div>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="key-upload"
              disabled={uploading}
            />
            <label htmlFor="key-upload">
              <Button asChild disabled={uploading}>
                <span className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  {uploading ? 'Adding...' : 'Add Key'}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No service accounts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first Google Service Account JSON key to start indexing
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{account.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {account.quotaUsed} / {account.quotaLimit}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{account.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(account.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(account.id)}
                  className="ml-4 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
