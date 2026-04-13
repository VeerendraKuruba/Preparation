# CMS-Driven Experiences

## Q1. What is a Headless CMS and how does it differ from a traditional CMS?

**Answer:**

**Traditional CMS (e.g., WordPress):** Tightly coupled — the CMS controls both content storage AND the frontend presentation layer (themes/templates). Content can only be delivered as HTML pages.

**Headless CMS (e.g., Contentful, Sanity, Strapi):** Decoupled — CMS handles content management only, delivers content via REST/GraphQL APIs. The frontend is completely separate (React, Next.js, mobile, etc.).

```
Traditional:           Headless:
┌─────────────┐       ┌─────────────┐    API    ┌───────────┐
│  WordPress  │       │  Contentful │ ─────────▶│  Next.js  │
│  (content + │       │  (content   │           │  website  │
│   theme)    │       │   only)     │ ─────────▶│  iOS app  │
└─────────────┘       └─────────────┘           └───────────┘
```

**Benefits of Headless:**
- Use any frontend framework
- Serve same content to multiple channels (web, mobile, kiosk)
- Frontend teams independent of content teams
- Better performance (static generation from API data)
- A/B test layout without touching backend

---

## Q2. How do you build a CMS-driven page in Next.js?

**Answer:**

```tsx
// Using Contentful as example

// lib/contentful.ts
import { createClient } from 'contentful';

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
});

export async function getPageBySlug(slug: string) {
  const entries = await client.getEntries({
    content_type: 'landingPage',
    'fields.slug': slug,
    include: 3, // depth for nested content
  });
  return entries.items[0];
}

// app/[slug]/page.tsx — SSG from CMS content
import { getPageBySlug } from '@/lib/contentful';

// Generate static pages for all CMS slugs at build time
export async function generateStaticParams() {
  const pages = await getAllPages();
  return pages.map((page) => ({ slug: page.fields.slug }));
}

export default async function CMSPage({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug);

  if (!page) notFound();

  // Render dynamic component list from CMS
  return (
    <main>
      {page.fields.sections.map((section) => (
        <DynamicSection key={section.sys.id} section={section} />
      ))}
    </main>
  );
}

// components/DynamicSection.tsx — render any CMS component type
function DynamicSection({ section }: { section: ContentfulSection }) {
  const componentMap = {
    hero: HeroSection,
    featureGrid: FeatureGrid,
    testimonials: Testimonials,
    ctaBanner: CTABanner,
  };

  const Component = componentMap[section.sys.contentType.sys.id];
  return Component ? <Component data={section.fields} /> : null;
}
```

---

## Q3. How do you handle content preview / draft mode in a CMS?

**Answer:**

Editors need to preview unpublished changes before going live. Next.js supports Draft Mode for this.

```tsx
// app/api/preview/route.ts
import { draftMode } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  // Validate secret token
  if (secret !== process.env.PREVIEW_SECRET) {
    return new Response('Invalid token', { status: 401 });
  }

  draftMode().enable(); // Sets a cookie to enable draft mode

  redirect(`/${slug}`);
}

// In your data fetching — check draft mode
import { draftMode } from 'next/headers';

async function getPage(slug: string) {
  const { isEnabled } = draftMode();

  // Use preview API token if in draft mode
  const client = isEnabled ? previewClient : publishedClient;
  return client.getPageBySlug(slug);
}
```

---

## Q4. How do you handle rich text / structured content from a CMS?

**Answer:**

CMS rich text is typically stored as a structured JSON document (not raw HTML) to keep it renderer-agnostic.

```tsx
// Contentful rich text rendering
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';

const renderOptions = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <p className="mb-4 text-base leading-relaxed">{children}</p>
    ),
    [BLOCKS.HEADING_2]: (node, children) => (
      <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>
    ),
    [BLOCKS.EMBEDDED_ENTRY]: (node) => {
      const entry = node.data.target;
      // Render embedded components (e.g., call-to-action boxes)
      if (entry.sys.contentType.sys.id === 'callToAction') {
        return <CallToActionBlock data={entry.fields} />;
      }
    },
    [INLINES.HYPERLINK]: (node, children) => (
      <a href={node.data.uri} className="text-blue-600 underline">
        {children}
      </a>
    ),
  },
};

function RichTextRenderer({ content }: { content: Document }) {
  return <div>{documentToReactComponents(content, renderOptions)}</div>;
}
```

---

## Q5. How do you handle CMS content with ISR for optimal performance?

**Answer:**

ISR (Incremental Static Regeneration) lets you statically generate CMS pages at build time but revalidate them in the background when content changes.

```tsx
// Next.js App Router with ISR
async function getBlogPost(slug: string) {
  // Fetch from CMS
  const post = await contentfulClient.getPostBySlug(slug);
  return post;
}

// app/blog/[slug]/page.tsx
export const revalidate = 3600; // ISR: revalidate every hour

export default async function BlogPost({ params }) {
  const post = await getBlogPost(params.slug);
  return <Article post={post} />;
}

// On-demand revalidation via webhook (better than time-based)
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, slug } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(`/blog/${slug}`); // Trigger regeneration
  return Response.json({ revalidated: true });
}
```

**Setup:** Configure a webhook in Contentful/Sanity to POST to `/api/revalidate` whenever content is published. This triggers instant regeneration of only the changed pages.
