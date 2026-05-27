import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, User, Tag, MessageSquare } from 'lucide-react';
import { renderHighlighted } from '../utils/search';
import './SearchResults.css';

const FIELD_ICONS = {
  title: FileText,
  body: FileText,
  author: User,
  category: Tag,
};

function Highlighted({ parts }) {
  if (!parts || typeof parts === 'string') return <span>{parts}</span>;
  return (
    <span>
      {parts.map(p =>
        p.type === 'mark'
          ? <mark key={p.key} className="search-mark">{p.text}</mark>
          : <span key={p.key}>{p.text}</span>
      )}
    </span>
  );
}

export default function SearchResults({ results, query, onClose }) {
  if (!query.trim()) return null;

  return (
    <div className="search-results">
      <div className="search-results-header">
        <span>{results.length} result{results.length !== 1 ? 's' : ''} for <strong>"{query}"</strong></span>
      </div>

      {results.length === 0 ? (
        <div className="search-empty">
          <FileText size={32} />
          <p>No posts found for "{query}"</p>
          <span>Try different keywords or browse by category</span>
        </div>
      ) : (
        <div className="search-list">
          {results.map(post => {
            const titleParts = renderHighlighted(post.title, query, 80);
            const bodyParts = renderHighlighted(post.body, query, 140);
            return (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="search-result-item"
                onClick={onClose}>
                <div className="result-top">
                  <span className={`tag tag-${post.category}`}>{post.category}</span>
                  <div className="result-matched-fields">
                    {post._matchedFields.map(field => {
                      const Icon = FIELD_ICONS[field];
                      return (
                        <span key={field} className="result-field-badge">
                          {Icon && <Icon size={10} />} {field}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <h4 className="result-title">
                  <Highlighted parts={titleParts} />
                </h4>
                <p className="result-body">
                  <Highlighted parts={bodyParts} />
                </p>
                <div className="result-meta">
                  <User size={11} /> u/{post.author}
                  <MessageSquare size={11} style={{ marginLeft: 10 }} /> {post.comments?.length || 0} comments
                  <span style={{ marginLeft: 10 }}>· {post.votes} votes</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}