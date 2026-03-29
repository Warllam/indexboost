import { Zap, RotateCw, Activity, Github } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Zap,
    title: 'Batch Indexing',
    description: 'Submit thousands of URLs at once to Google\'s Indexing API',
  },
  {
    icon: RotateCw,
    title: 'Multi-Key Rotation',
    description: 'Automatically rotate between service accounts to maximize quotas',
  },
  {
    icon: Activity,
    title: 'Real-time Dashboard',
    description: 'Track submission status, success rates, and quota usage in real-time',
  },
  {
    icon: Github,
    title: 'Open Source',
    description: 'Self-host or contribute. Fully transparent and MIT licensed',
  },
];

export function Features() {
  return (
    <section id="features" className="container py-24 md:py-32">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center mb-16">
        <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
          Everything you need to index at scale
        </h2>
        <p className="max-w-[750px] text-lg text-muted-foreground">
          Simple, powerful, and built for SEO professionals
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="h-10 w-10 text-primary mb-2" />
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
