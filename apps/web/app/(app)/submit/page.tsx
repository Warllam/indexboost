import { auth } from '@/lib/auth';
import { UrlSubmitForm } from '@/components/app/url-submit-form';

export default async function SubmitPage() {
  const session = await auth();
  const token = (session as any)?.accessToken;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submit URLs</h1>
        <p className="text-muted-foreground mt-2">
          Submit your URLs to Google's Indexing API and IndexNow
        </p>
      </div>
      <UrlSubmitForm token={token} />
    </div>
  );
}
