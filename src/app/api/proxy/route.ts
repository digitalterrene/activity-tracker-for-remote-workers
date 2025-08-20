// app/api/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const retry = searchParams.get("retry");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  // Validate URL
  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch (error) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Block sensitive URLs for security
  if (
    targetUrl.hostname === "localhost" ||
    targetUrl.hostname === "127.0.0.1" ||
    targetUrl.hostname === "0.0.0.0" ||
    targetUrl.protocol === "file:"
  ) {
    return NextResponse.json(
      { error: "Local URLs are not allowed for security reasons" },
      { status: 403 }
    );
  }

  try {
    // Fetch the requested URL with proper headers
    const headers: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
    };

    // Add original request headers that are safe to forward
    const safeHeaders = ["referer", "origin"];
    for (const header of safeHeaders) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    // Set timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(targetUrl.toString(), {
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If this is a retry, return error to trigger direct mode
      if (retry === "true") {
        return NextResponse.json(
          { error: "Failed to fetch URL" },
          { status: response.status }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    // Get the content type
    const contentType = response.headers.get("content-type") || "";

    // If it's HTML, we'll process and inject our tracking script
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Remove problematic headers and meta tags that might block iframe rendering
      const securityPatterns = [
        /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
        /<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi,
        /<meta[^>]+http-equiv=["']Frame-Options["'][^>]*>/gi,
        /<meta[^>]+content-security-policy[^>]*>/gi,
        /<meta[^>]+x-frame-options[^>]*>/gi,
      ];

      securityPatterns.forEach((pattern) => {
        html = html.replace(pattern, "");
      });

      // Remove script nonce attributes that might break execution
      html = html.replace(/nonce="[^"]*"/gi, "");

      // Inject our enhanced tracking script
      const trackingScript = `
        <script>
          (function() {
            // Track page title changes
            let currentTitle = document.title;
            
            // Override document.title setter to track title changes
            const originalTitleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
            if (originalTitleDescriptor && originalTitleDescriptor.set) {
              Object.defineProperty(document, 'title', {
                get: function() {
                  return originalTitleDescriptor.get.call(this);
                },
                set: function(value) {
                  originalTitleDescriptor.set.call(this, value);
                  currentTitle = value;
                  window.parent.postMessage({
                    type: 'titleChanged',
                    title: value
                  }, '*');
                }
              });
            }
            
            // Periodically check for title changes as a fallback
            setInterval(() => {
              try {
                if (document.title !== currentTitle) {
                  currentTitle = document.title;
                  window.parent.postMessage({
                    type: 'titleChanged',
                    title: document.title
                  }, '*');
                }
              } catch (e) {
                // Silently handle errors
              }
            }, 1000);
            
            // Enhanced activity tracking
            let lastActivityTime = Date.now();
            let activityBuffer = [];
            const MAX_BUFFER_SIZE = 20;
            const FLUSH_INTERVAL = 2000;
            
            // Function to send activities to parent
            function sendActivity(type, details) {
              const activity = {
                type: type,
                details: details,
                timestamp: Date.now(),
                url: window.location.href,
                title: document.title
              };
              
              activityBuffer.push(activity);
              
              // Send immediately for important events
              if (type === 'navigation' || type === 'form_submit') {
                flushActivities();
              }
              
              // Flush if buffer is full
              if (activityBuffer.length >= MAX_BUFFER_SIZE) {
                flushActivities();
              }
            }
            
            // Function to flush activities to parent
            function flushActivities() {
              if (activityBuffer.length > 0) {
                try {
                  window.parent.postMessage({
                    type: 'activities_flush',
                    activities: activityBuffer
                  }, '*');
                  activityBuffer = [];
                } catch (e) {
                  // Silently handle errors
                }
              }
            }
            
            // Regular flush interval
            setInterval(flushActivities, FLUSH_INTERVAL);
            
            // Track page visibility changes
            document.addEventListener('visibilitychange', function() {
              sendActivity('visibility_change', {
                state: document.visibilityState
              });
            });
            
            // Track clicks with more details
            document.addEventListener('click', function(e) {
              const target = e.target;
              const text = target.textContent?.trim().substring(0, 50) || '';
              
              sendActivity('click', {
                element: target.tagName,
                id: target.id || '',
                className: target.className || '',
                name: target.name || '',
                text: text,
                x: e.clientX,
                y: e.clientY,
                url: target.href || ''
              });
            }, true);
            
            // Track input changes with more context
            document.addEventListener('input', function(e) {
              const target = e.target;
              const value = target.value.substring(0, 100);
              
              sendActivity('input', {
                element: target.tagName,
                id: target.id || '',
                className: target.className || '',
                name: target.name || '',
                value: value,
                valueLength: target.value.length
              });
            });
            
            // Track form submissions
            document.addEventListener('submit', function(e) {
              const form = e.target;
              const inputs = Array.from(form.elements).filter(el => el.name).map(el => ({
                name: el.name,
                type: el.type,
                value: el.value.substring(0, 50)
              }));
              
              sendActivity('form_submit', {
                formId: form.id || '',
                inputs: inputs
              });
            });
            
            // Track scrolling with viewport information
            let scrollTimeout;
            document.addEventListener('scroll', function() {
              clearTimeout(scrollTimeout);
              scrollTimeout = setTimeout(function() {
                const viewportHeight = window.innerHeight;
                const totalHeight = document.documentElement.scrollHeight;
                const scrolled = window.scrollY;
                const percent = Math.round((scrolled / (totalHeight - viewportHeight)) * 100);
                
                sendActivity('scroll', {
                  x: window.scrollX,
                  y: window.scrollY,
                  percent: percent,
                  viewportHeight: viewportHeight,
                  totalHeight: totalHeight
                });
              }, 250);
            });
            
            // Track focus changes
            document.addEventListener('focusin', function(e) {
              const target = e.target;
              sendActivity('focus', {
                element: target.tagName,
                id: target.id || '',
                className: target.className || '',
                name: target.name || ''
              });
            });
            
            // Track beforeunload
            window.addEventListener('beforeunload', function() {
              flushActivities();
            });
            
            // Send initial load event
            window.addEventListener('load', function() {
              sendActivity('page_load', {
                url: window.location.href,
                title: document.title
              });
            });
            
            // Patch history API to track navigation
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function() {
              originalPushState.apply(this, arguments);
              sendActivity('navigation', {
                type: 'pushState',
                url: window.location.href
              });
            };
            
            history.replaceState = function() {
              originalReplaceState.apply(this, arguments);
              sendActivity('navigation', {
                type: 'replaceState',
                url: window.location.href
              });
            };
            
            window.addEventListener('popstate', function() {
              sendActivity('navigation', {
                type: 'popstate',
                url: window.location.href
              });
            });
          })();
        </script>
      `;

      // Inject the script before the closing body tag
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${trackingScript}</body>`);
      } else {
        html += trackingScript;
      }

      // Update base tag to ensure relative URLs work correctly
      if (!html.includes("<base")) {
        const baseTag = `<base href="${targetUrl.toString()}" target="_blank">`;
        html = html.replace("<head>", `<head>${baseTag}`);
      }

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
          "X-Frame-Options": "ALLOWALL",
          "Content-Security-Policy":
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
        },
      });
    } else {
      // For non-HTML content, return as-is
      const buffer = await response.arrayBuffer();

      // Get content type from response or infer from URL
      let responseContentType = contentType;
      if (!responseContentType) {
        if (targetUrl.pathname.endsWith(".css"))
          responseContentType = "text/css";
        else if (targetUrl.pathname.endsWith(".js"))
          responseContentType = "application/javascript";
        else if (targetUrl.pathname.endsWith(".png"))
          responseContentType = "image/png";
        else if (
          targetUrl.pathname.endsWith(".jpg") ||
          targetUrl.pathname.endsWith(".jpeg")
        )
          responseContentType = "image/jpeg";
        else if (targetUrl.pathname.endsWith(".gif"))
          responseContentType = "image/gif";
        else if (targetUrl.pathname.endsWith(".svg"))
          responseContentType = "image/svg+xml";
        else responseContentType = "application/octet-stream";
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": responseContentType,
          "Access-Control-Allow-Origin": "*",
          "X-Frame-Options": "ALLOWALL",
        },
      });
    }
  } catch (error) {
    console.error("Proxy error:", error);

    // If this is a retry, return error to trigger direct mode
    if (retry === "true") {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 500 }
      );
    }

    // Return a user-friendly error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error Loading Page</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: 2rem; 
              text-align: center; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .error-container { 
              background: rgba(255, 255, 255, 0.1); 
              backdrop-filter: blur(10px);
              padding: 2rem;
              border-radius: 1rem;
              max-width: 500px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }
            h1 { color: #ff6b6b; margin-bottom: 1rem; }
            p { margin-bottom: 1.5rem; line-height: 1.6; }
            .btn-group { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
            .retry-btn { 
              background: #4ecdc4; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              cursor: pointer; 
              font-weight: 600;
              transition: all 0.3s ease;
            }
            .retry-btn:hover { 
              background: #45b7aa; 
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
            .direct-btn { 
              background: #ff6b6b; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; 
              cursor: pointer; 
              font-weight: 600;
              transition: all 0.3s ease;
            }
            .direct-btn:hover { 
              background: #ff5252; 
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>🚫 Unable to Load Page</h1>
            <p>The website <strong>${url}</strong> could not be loaded due to security restrictions.</p>
            <p>This website may be blocking display in frames or has strict security policies.</p>
            <div class="btn-group">
              <button class="retry-btn" onclick="window.location.reload()">Try Again with Proxy</button>
              <button class="direct-btn" onclick="window.parent.postMessage({ type: 'tryDirectMode' }, '*')">Try Direct Access</button>
            </div>
          </div>
          <script>
            // Send error message to parent
            try {
              window.parent.postMessage({ 
                type: 'proxyError',
                url: '${url}',
                error: 'Failed to load via proxy'
              }, '*');
            } catch (e) {
              console.log('Could not communicate with parent window');
            }
          </script>
        </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 200, // Still return 200 so iframe load event fires
      headers: {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
