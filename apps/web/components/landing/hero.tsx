import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="container flex flex-col items-center justify-center gap-8 py-24 md:py-32">
      <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-6xl lg:text-7xl lg:leading-[1.1]">
          Index Your Pages on Google{' '}
          <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            at Scale
          </span>
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Submit thousands of URLs to Google's Indexing API. Multi-key rotation. IndexNow support. Free & open source.
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started — Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="w-full max-w-5xl rounded-lg border bg-zinc-950/50 p-2 backdrop-blur">
        <div className="aspect-video rounded-md bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-muted-foreground">
          Dashboard Preview
        </div>
      </div>
    </section>
  );
}
