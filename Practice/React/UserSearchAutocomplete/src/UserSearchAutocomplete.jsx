import React, { useState } from 'react';
import { useDebounce } from './hooks/useDebounce';
import { useUserSearch } from './hooks/useUserSearch';
import './UserSearchAutocomplete.css';

const DEBOUNCE_MS = 500;

export default function UserSearchAutocomplete() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const { users, loading, error } = useUserSearch(debouncedQuery);

  const showList = debouncedQuery.trim().length > 0;
  const isEmpty = showList && !loading && !error && users.length === 0;

  return (
    <div className="user-search-autocomplete">
      <label htmlFor="user-search-input" className="user-search-label">
        Search users
      </label>
      <input
        id="user-search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to search users..."
        autoComplete="off"
        className="user-search-input"
      />

      <div id="user-search-status" className="sr-only">
        {loading && 'Loading search results.'}
        {error && `Error: ${error}`}
        {isEmpty && 'No users found.'}
        {showList && !loading && !error && users.length > 0 && `${users.length} user(s) found.`}
      </div>

      <div id="user-search-results" className="user-search-results">
        {loading && (
          <p className="user-search-message user-search-loading">
            Loading...
          </p>
        )}
        {error && (
          <p className="user-search-message user-search-error">
            {error}
          </p>
        )}
        {isEmpty && (
          <p className="user-search-message user-search-empty">
            No users found
          </p>
        )}
        {showList && !loading && !error && users.length > 0 && (
          <ul className="user-list">
            {users.map((user) => (
              <li key={user.id} className="user-list-item">
                {user.firstName} {user.lastName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
