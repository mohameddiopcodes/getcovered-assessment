import { NextRequest } from 'next/server';
import { corsHeaders, createCorsResponse, handleCorsPreflight } from '../utils/cors';

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return createCorsResponse({ error: 'URL is required' }, 400);
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return createCorsResponse({ error: 'Invalid URL format' }, 400);
    }

    // Generate a realistic browser user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Try multiple approaches to bypass browser detection
    const fetchAttempts: Array<{headers: Record<string, string>}> = [
      // Attempt 1: Full browser headers
      {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"'
        }
      },
      // Attempt 2: Minimal headers (some sites prefer this)
      {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      },
      // Attempt 3: Different user agent
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;

    // Try each approach until one succeeds
    for (const attempt of fetchAttempts) {
      try {
        response = await fetch(validUrl.toString(), {
          method: 'GET',
          ...attempt,
          signal: AbortSignal.timeout(15000),
        });

        // Check if we got a successful response
        if (response.ok) {
          break;
        }

        // If we got an incompatible browser response, try next approach
        const responseText = await response.text();
        if (responseText.includes('incompatible-browser') || 
            responseText.includes('browser not supported') ||
            responseText.includes('please use a modern browser')) {
          response = null;
          continue;
        }

        // If it's a different error, break and handle it
        break;
      } catch (error) {
        lastError = error as Error;
        response = null;
        continue;
      }
    }

    if (!response) {
      return createCorsResponse(
        { error: `Failed to fetch URL: ${lastError?.message || 'All fetch attempts failed'}` },
        500
      );
    }

    if (!response.ok) {
      return createCorsResponse(
        { 
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          status: response.status 
        },
        response.status
      );
    }

    const html = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Check if the response is actually HTML
    if (!contentType.includes('text/html')) {
      return createCorsResponse(
        { 
          error: 'URL does not return HTML content',
          contentType 
        },
        400
      );
    }

    return createCorsResponse({
      html,
      url: validUrl.toString(),
      status: response.status,
      contentType,
      contentLength: html.length,
    });

  } catch (error) {
    console.error('Error fetching HTML:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return createCorsResponse(
          { error: 'Request timeout - URL took too long to respond' },
          408
        );
      }
      
      return createCorsResponse(
        { error: `Failed to fetch URL: ${error.message}` },
        500
      );
    }

    return createCorsResponse(
      { error: 'An unexpected error occurred' },
      500
    );
  }
}
