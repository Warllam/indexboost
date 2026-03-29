import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuotaBars } from '@/components/app/quota-bars';
import { TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default async function DashboardPage() {
  const session = await auth();
  const token = (session as any)?.accessToken;

  // Fetch stats and quotas
  let stats = { today: 0, successRate: 0, totalIndexed: 0 };
  let quotas: any[] = [];

  try {
    const [statsData, quotasData] = await Promise.all([
      api.getStats(token).catch(() => null),
      api.getQuotas(token).catch(() => null),
    ]);
    
    if (statsData) stats = statsData as any;
    if (quotasData) quotas = (quotasData as any)?.quotas || [];
  } catch (error) {
    // Handle error silently for now
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {session?.user?.name || 'User'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">URLs Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">URLs submitted today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Successful submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Indexed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIndexed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All-time submissions</p>
          </CardContent>
        </Card>
      </div>

      <QuotaBars quotas={quotas} />

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get started with IndexBoost in 3 easy steps</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Add a Service Account</h4>
                <p className="text-sm text-muted-foreground">
                  Upload your Google Service Account JSON key in the Service Keys page
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Submit URLs</h4>
                <p className="text-sm text-muted-foreground">
                  Go to Submit URLs page and paste your URLs, one per line
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Track Progress</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor submission status and quota usage in real-time
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
