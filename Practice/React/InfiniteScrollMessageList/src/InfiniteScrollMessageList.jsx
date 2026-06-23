import React from 'react';
import { useInfiniteMessages } from './hooks/useInfiniteMessages';
import './InfiniteScrollMessageList.css';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function InfiniteScrollMessageList() {
  const { messages, loading, error, done, sentinelRef, retry } = useInfiniteMessages();

  return (
    <section className="message-list-panel" aria-label="Message thread">
      <div className="message-list-scroll">
        <ul className="message-list">
          {messages.map((message) => {
            const isSelf = message.sender === 'You';
            return (
              <li
                key={message.id}
                className={`message-item ${isSelf ? 'message-item--self' : ''}`}
              >
                <div className="message-bubble">
                  <span className="message-sender">{message.sender}</span>
                  <p className="message-body">{message.body}</p>
                  <time className="message-time" dateTime={message.timestamp}>
                    {formatTime(message.timestamp)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>

        <div ref={sentinelRef} className="message-list-sentinel" aria-hidden="true" />

        <div className="message-list-footer" aria-live="polite">
          {loading && <p className="message-list-status">Loading more…</p>}
          {error && (
            <button type="button" className="message-list-retry" onClick={retry}>
              Retry
            </button>
          )}
          {done && !loading && (
            <p className="message-list-status message-list-status--muted">
              End of conversation
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
