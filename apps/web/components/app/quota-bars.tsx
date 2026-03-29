'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface QuotaBarProps {
  quotas: Array<{
    keyName: string;
    used: number;
    limit: number;
  }>;
}

export function QuotaBars({ quotas }: QuotaBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quota Usage</CardTitle>
        <CardDescription>Daily quota per service account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {quotas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No service accounts configured. Add one in the Service Keys page.
          </p>
        ) : (
          quotas.map((quota, i) => {
            const percentage = (quota.used / quota.limit) * 100;
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{quota.keyName}</span>
                  <span className="text-muted-foreground">
                    {quota.used} / {quota.limit}
                  </span>
                </div>
                <Progress value={percentage} />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
