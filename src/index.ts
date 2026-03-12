/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { DOMParser } from '@xmldom/xmldom';

export default {
  async scheduled(event, env, ctx) {
    const rssUrl = 'https://chelseafarmerssupply.substack.com/feed';
    
    // Fetch RSS feed
    const response = await fetch(rssUrl);
    const xml = await response.text();
    
    // Parse XML (simple parser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('item');
    
    if (items.length > 0) {
      const latest = items[0]; // First item is newest
      
	  const getText = (tag: string): string =>
        latest.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

      const title = getText('title');
      const link = getText('link');
      const description = getText('description');
      
      // Store in KV
      await env.LATEST_POST.put('current', JSON.stringify({
        title, link, description,
        fetchedAt: new Date().toISOString()
      }));
      
      console.log(`Updated: ${title}`);
    }
  },
  
  async fetch(request, env) {
    // Serve the latest post from KV
    const post = await env.LATEST_POST.get('current');
    
    if (!post) {
      return new Response('No posts yet', { status: 404 });
    }
    
    const data = JSON.parse(post);
    
    // Return HTML for your website
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chelsea Farmers Supply - Latest Post</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <h1>${data.title}</h1>
          <p>${data.description}</p>
          <a href="${data.link}">Read full post →</a>
          <p>Updated: ${data.fetchedAt}</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
} satisfies ExportedHandler<Env>;
