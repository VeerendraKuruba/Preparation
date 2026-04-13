# Campaigns, Experimentation & A/B Testing

## Q1. What is A/B testing and how do you implement it in a frontend?

**Answer:**

A/B testing (split testing) serves different variants of a UI to different user segments to measure which performs better on a defined metric (CTR, conversion, engagement).

**Core concepts:**
- **Variant A (control):** Current experience
- **Variant B (treatment):** New experience being tested
- **Assignment:** Randomly assign users to variants (usually 50/50)
- **Metric:** What you measure (sign-up rate, clicks, revenue)
- **Statistical significance:** Confidence that result is not by chance (typically p < 0.05, 95% confidence)

**Basic implementation:**
```tsx
// Deterministic assignment by user ID (same user always gets same variant)
function getVariant(userId: string, experimentId: string): 'control' | 'treatment' {
  const hash = murmurhash(`${userId}:${experimentId}`);
  return hash % 2 === 0 ? 'control' : 'treatment';
}

function SignUpPage({ userId }: { userId: string }) {
  const variant = getVariant(userId, 'signup-cta-test');

  return (
    <div>
      {variant === 'control'
        ? <CTAButton>Sign Up Free</CTAButton>
        : <CTAButton>Get Started</CTAButton>
      }
    </div>
  );
}
```

---

## Q2. What are Feature Flags and how do they relate to experimentation?

**Answer:**

Feature flags (feature toggles) let you enable/disable features at runtime without deploying new code. They underpin experimentation.

**Use cases:**
- **Gradual rollout:** Release to 1% → 10% → 50% → 100%
- **A/B test:** 50% see new feature, 50% see old
- **Kill switch:** Instantly disable broken feature in production
- **Beta access:** Enable only for specific users/accounts
- **Operational flags:** Toggle costly features during peak load

**Popular tools:** LaunchDarkly, Optimizely, GrowthBook (open source), AWS AppConfig, Unleash, Split.io

```tsx
// LaunchDarkly example
import { useLDClient, useFlags } from 'launchdarkly-react-client-sdk';

function PricingPage() {
  const { newPricingTable } = useFlags();

  return newPricingTable ? <NewPricingTable /> : <OldPricingTable />;
}

// Identify user context for targeting
function App({ user }: { user: User }) {
  const client = useLDClient();

  useEffect(() => {
    client?.identify({
      key: user.id,
      email: user.email,
      custom: {
        plan: user.plan,
        accountAge: user.createdAt,
        country: user.country,
      },
    });
  }, [user]);
}
```

---

## Q3. How do you run experiments without causing layout flicker or poor UX?

**Answer:**

**The problem:** If variant assignment happens client-side, users see the control momentarily before the variant loads (flash of original content — FOOC).

**Solution 1 — SSR / Edge-based assignment (best):**
```tsx
// Next.js middleware — assign variant at edge before HTML is sent
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get or create stable assignment
  let experimentCookie = request.cookies.get('exp-homepage')?.value;

  if (!experimentCookie) {
    const variant = Math.random() < 0.5 ? 'control' : 'treatment';
    response.cookies.set('exp-homepage', variant, {
      maxAge: 60 * 60 * 24 * 30, // 30 days — sticky
      httpOnly: true,
      sameSite: 'lax',
    });
    experimentCookie = variant;
  }

  // Pass variant as header for Server Components to read
  response.headers.set('x-experiment-homepage', experimentCookie);
  return response;
}
```

```tsx
// Server Component reads variant from headers — no flicker
import { headers } from 'next/headers';

export default function HomePage() {
  const headersList = headers();
  const variant = headersList.get('x-experiment-homepage');

  return variant === 'treatment' ? <NewHero /> : <OldHero />;
}
```

**Solution 2 — Skeleton/loading state:** Show skeleton while client determines variant (hides flicker but adds latency).

---

## Q4. How do you track experiment exposure and results?

**Answer:**

```tsx
// Track when user is exposed to experiment variant
function useExperiment(experimentId: string) {
  const { user } = useAuth();
  const variant = getVariant(user.id, experimentId);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      // Fire exposure event once
      analytics.track('Experiment Viewed', {
        experimentId,
        variant,
        userId: user.id,
        timestamp: Date.now(),
      });
      hasTracked.current = true;
    }
  }, [experimentId, variant]);

  return variant;
}

// Track conversion event
function SignUpButton({ experimentId, variant }: Props) {
  const handleClick = () => {
    analytics.track('Sign Up Clicked', {
      experimentId,
      variant,
    });
    // proceed with signup
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

**Key tracking rules:**
- Only track exposure when the user *actually sees* the variant (not just on page load)
- Don't track exposure before the variant is determined (causes incorrect data)
- Use a consistent user identifier across sessions for proper attribution

---

## Q5. What is the difference between client-side and server-side A/B testing?

**Answer:**

| | Client-Side | Server-Side |
|--|-------------|-------------|
| **Assignment** | Browser (JS SDK) | Server/CDN edge |
| **Flicker** | Yes (FOOC) | No |
| **Performance** | Extra JS load | No extra load |
| **Personalization** | Limited (browser data) | Full (DB, user segments) |
| **Tools** | Optimizely Web, VWO | LaunchDarkly, Split, custom |
| **Best for** | Simple visual tests | Complex logic, authenticated users |

**Recommendation:** Use **edge middleware** (Next.js middleware / Cloudflare Workers) for assignment — gets the best of both: server-side speed with CDN distribution.

---

## Q6. How do you run multi-variate tests and manage experiment conflicts?

**Answer:**

**Multi-variate testing (MVT):** Test multiple variables simultaneously.
- Test headline (2 variants) × CTA color (2 variants) = 4 combinations
- Requires larger sample sizes to reach significance

**Experiment conflicts:** When a user is in multiple experiments affecting the same UI element.

**Solutions:**
1. **Mutex groups:** Mark experiments as mutually exclusive — users can only be in one
2. **Priority system:** Higher priority experiment wins on same element
3. **Holdout groups:** Reserve X% of users who see no experiments (control baseline)

```tsx
// Experiment manager handles conflicts
class ExperimentManager {
  private mutexGroups: Map<string, string[]> = new Map();

  assignUser(userId: string, experimentId: string): string {
    const group = this.getMutexGroup(experimentId);

    if (group) {
      // Check if user is already in another experiment in this group
      const activeExp = this.getActiveExperimentInGroup(userId, group);
      if (activeExp && activeExp !== experimentId) {
        return 'holdout'; // exclude from this experiment
      }
    }

    return this.computeVariant(userId, experimentId);
  }
}
```

---

## Q7. What is a Campaign management system from a frontend perspective?

**Answer:**

Campaigns refer to coordinated marketing/product initiatives that often involve:
1. **Targeted content:** Different experiences based on UTM params, user segments, geo
2. **Time-bounded changes:** Content active between specific dates
3. **Channel-specific experiences:** Different UI for email → landing page vs. direct traffic
4. **Promotional pricing/offers:** Dynamic content served to campaign audiences

```tsx
// Reading UTM parameters and personalizing experience
function useCampaign() {
  const router = useRouter();

  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source'),      // 'email', 'google', 'twitter'
      medium: params.get('utm_medium'),      // 'cpc', 'organic', 'newsletter'
      campaign: params.get('utm_campaign'),  // 'spring-sale', 'product-launch'
    };
  }, []);
}

function LandingPage() {
  const campaign = useCampaign();

  // Personalize based on traffic source
  const headline =
    campaign.source === 'email' ? 'Welcome back!' :
    campaign.campaign === 'spring-sale' ? '50% off this week only' :
    'The #1 eSignature Solution';

  return (
    <Hero headline={headline} campaignId={campaign.campaign} />
  );
}
```

**CMS integration:** Campaigns are often managed in the CMS — marketers create campaign-specific landing pages without engineering involvement. The frontend renders whatever content the CMS returns for the given campaign slug.
