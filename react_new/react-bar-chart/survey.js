// App.jsx — full implementation with loading/error/success states

const MOCK_API = 'https://jsonplaceholder.typicode.com/posts'; // stand-in for mock

function useSurveys() {
  const [surveys, setSurveys] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]   = React.useState(null);

  React.useEffect(() => {
    const controller = new AbortController();

    fetch(MOCK_API, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Map to survey shape
        const mapped = data.slice(0, 10).map(p => ({
          id: p.id,
          title: p.title,
          responses: Math.floor(Math.random() * 500),
          status: p.id % 3 === 0 ? 'Closed' : 'Active',
          createdAt: new Date(Date.now() - p.id * 86400000).toLocaleDateString(),
        }));
        setSurveys(mapped);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { surveys, loading, error };
}

function SurveyRow({ survey }) {
  return (
    <tr>
      <td>{survey.title}</td>
      <td>{survey.responses}</td>
      <td>
        <span className={`badge ${survey.status === 'Active' ? 'active' : 'closed'}`}>
          {survey.status}
        </span>
      </td>
      <td>{survey.createdAt}</td>
      <td>
        <button className="btn-action">View</button>
      </td>
    </tr>
  );
}

function SurveyTable({ surveys }) {
  if (!surveys.length) {
    return <p className="empty-state">No surveys found.</p>;
  }
  return (
    <table className="survey-table">
      <thead>
        <tr>
          <th>Title</th><th>Responses</th><th>Status</th><th>Created</th><th></th>
        </tr>
      </thead>
      <tbody>
        {surveys.map(s => <SurveyRow key={s.id} survey={s} />)}
      </tbody>
    </table>
  );
}

function App() {
  const { surveys, loading, error } = useSurveys();

  return (
    <div className="app">
      <header className="app-header">
        <h1>SurveyMonkey</h1>
        <nav>
          <a href="#">My Surveys</a>
          <a href="#">Templates</a>
        </nav>
        <button className="btn-primary">+ Create Survey</button>
      </header>

      <main className="main-content">
        <h2>My Surveys</h2>

        {loading && (
          <div className="loading-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        )}

        {error && (
          <div className="error-state" role="alert">
            <p>Failed to load surveys: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!loading && !error && <SurveyTable surveys={surveys} />}
      </main>
    </div>
  );
}