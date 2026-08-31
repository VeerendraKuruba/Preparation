/**
 * LinkedIn Phone Screen — Infinite Scroll (Vanilla JS)
 * Run in browser: open practice/infinite-scroll-demo.html or paste into console
 *
 * Reported: plain JS infinite scroll with fetch/pagination; throttle optimization
 */

export function createInfiniteScroll({
  container,
  fetchPage,
  renderItem,
  pageSize = 20,
  thresholdPx = 200,
  useIntersectionObserver = true,
}) {
  let page = 0;
  let loading = false;
  let hasMore = true;
  const sentinel = document.createElement("div");
  sentinel.setAttribute("data-sentinel", "true");
  sentinel.style.height = "1px";
  container.appendChild(sentinel);

  async function loadMore() {
    if (loading || !hasMore) return;
    loading = true;

    try {
      const items = await fetchPage(page);
      if (!items.length) {
        hasMore = false;
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const item of items) {
        fragment.appendChild(renderItem(item));
      }
      container.insertBefore(fragment, sentinel);
      page += 1;
      if (items.length < pageSize) hasMore = false;
    } catch (err) {
      console.error("Failed to load page", page, err);
    } finally {
      loading = false;
    }
  }

  let observer;
  let onScroll;

  function attach() {
    if (useIntersectionObserver && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) loadMore();
        },
        { root: container === document.documentElement ? null : container, rootMargin: `${thresholdPx}px` }
      );
      observer.observe(sentinel);
    } else {
      onScroll = throttle(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollTop + clientHeight >= scrollHeight - thresholdPx) {
          loadMore();
        }
      }, 200);
      container.addEventListener("scroll", onScroll);
    }
    loadMore();
  }

  function detach() {
    observer?.disconnect();
    if onScroll) container.removeEventListener("scroll", onScroll);
    sentinel.remove();
  }

  attach();
  return { loadMore, detach, getState: () => ({ page, loading, hasMore }) };
}

function throttle(fn, waitMs) {
  let last = 0;
  let timer;
  return (...args) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = undefined;
        fn(...args);
      }, remaining);
    }
  };
}

// ─── Demo fetch (Node guard) ─────────────────────────────────────────────────

if (typeof document !== "undefined") {
  const mockData = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    title: `Feed item #${i + 1}`,
  }));

  window.initInfiniteScrollDemo = function initInfiniteScrollDemo() {
    const container = document.getElementById("feed");
    if (!container) return;

    createInfiniteScroll({
      container,
      pageSize: 10,
      fetchPage: async (page) => {
        await new Promise((r) => setTimeout(r, 400));
        const start = page * 10;
        return mockData.slice(start, start + 10);
      },
      renderItem: (item) => {
        const el = document.createElement("article");
        el.className = "feed-item";
        el.textContent = item.title;
        return el;
      },
    });
  };
}
