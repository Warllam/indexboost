import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out IndexBoost',
    features: [
      '200 URLs per day',
      '1 service account',
      'Google Indexing API',
      'IndexNow support',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For growing websites',
    features: [
      '10,000 URLs per day',
      '10 service accounts',
      'Multi-key rotation',
      'Priority indexing',
      'Email support',
    ],
    popular: true,
  },
  {
    name: 'Business',
    price: '$99',
    description: 'For agencies and enterprises',
    features: [
      'Unlimited URLs',
      'Unlimited service accounts',
      'API access',
      'Custom integrations',
      'Dedicated support',
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="container py-24 md:py-32">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center mb-16">
        <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
          Simple, transparent pricing
        </h2>
        <p className="max-w-[750px] text-lg text-muted-foreground">
          Choose the plan that fits your needs
        </p>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? 'border-primary shadow-lg' : ''}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {plan.popular && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                    Popular
                  </span>
                )}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/register" className="w-full">
                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full"
                >
                  Get Started
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
