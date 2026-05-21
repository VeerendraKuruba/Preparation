import { useState, useEffect } from 'react';

/**
 * Simple useFetch - one state: { data, loading, error }
 */
function useFetch(url, options = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(url, options)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: null, loading: false, error: err.message }));
  }, [url]);

  const refetch = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, options)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: null, loading: false, error: err.message }));
  };

  return { ...state, refetch };
}

export default useFetch;
