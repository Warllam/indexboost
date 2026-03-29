/**
 * IndexNow Service
 * Submits URLs to IndexNow API (Bing, Yandex, DuckDuckGo)
 */

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

interface IndexNowResult {
  success: boolean;
  error?: string;
}

/**
 * Submits a URL to IndexNow API
 * Uses a simple API key-based submission (no service account needed)
 */
export async function submitToIndexNow(url: string): Promise<IndexNowResult> {
  try {
    // Extract domain from URL for the key location
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    
    // Simple submission - IndexNow doesn't require authentication
    // In production, you'd want to generate and host a key file at yourdomain.com/{key}.txt
    const body = {
      host: host,
      key: 'indexboost-default-key', // In production: generate unique key per domain
      keyLocation: `https://${host}/indexboost-default-key.txt`,
      urlList: [url],
    };
    
    // Try primary endpoint
    const response = await fetch(INDEXNOW_ENDPOINTS[0], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
    
    // IndexNow returns 200 for success, 202 for accepted
    if (response.ok || response.status === 202) {
      return { success: true };
    }
    
    // Handle rate limiting
    if (response.status === 429) {
      return { 
        success: false, 
        error: 'Rate limited by IndexNow API. Retry later.' 
      };
    }
    
    return { 
      success: false, 
      error: `IndexNow API returned status ${response.status}` 
    };
    
  } catch (error: any) {
    return { 
      success: false, 
      error: `IndexNow error: ${error.message || 'Unknown error'}` 
    };
  }
}

/**
 * Batch submit multiple URLs to IndexNow (more efficient)
 */
export async function batchSubmitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { success: false, error: 'No URLs provided' };
  }
  
  try {
    // Group URLs by domain
    const urlsByDomain = new Map<string, string[]>();
    
    for (const url of urls) {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      
      if (!urlsByDomain.has(host)) {
        urlsByDomain.set(host, []);
      }
      urlsByDomain.get(host)!.push(url);
    }
    
    // Submit each domain separately (IndexNow requirement)
    const results = await Promise.allSettled(
      Array.from(urlsByDomain.entries()).map(async ([host, domainUrls]) => {
        const body = {
          host: host,
          key: 'indexboost-default-key',
          keyLocation: `https://${host}/indexboost-default-key.txt`,
          urlList: domainUrls,
        };
        
        const response = await fetch(INDEXNOW_ENDPOINTS[0], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(body),
        });
        
        if (!response.ok && response.status !== 202) {
          throw new Error(`Status ${response.status}`);
        }
      })
    );
    
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length === 0) {
      return { success: true };
    }
    
    return { 
      success: false, 
      error: `${failures.length}/${results.length} submissions failed` 
    };
    
  } catch (error: any) {
    return { 
      success: false, 
      error: `Batch IndexNow error: ${error.message || 'Unknown error'}` 
    };
  }
}
