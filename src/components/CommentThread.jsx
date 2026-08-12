import React, { useState } from 'react';
import { ArrowUp, ArrowDown, MessageSquare, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForum } from '../context/ForumContext';
import MarkdownRenderer from './MarkdownRenderer';
import MarkdownEditor from './MarkdownEditor';
import InlineConfirm from './InlineConfirm';
import './CommentThread.css';

function CommentNode({ comment, postId, allComments, depth = 0 }) {
  const { user, voteComment, votedComments, addComment,
          editComment, deleteComment } = useForum();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const key = `${postId}-${comment.id}`;
  const voted = votedComments[key] || 0;
  const replies = allComments.filter(c => c.parentId === comment.id);
  const isAuthor = user?.username === comment.author;
  const isDeleted = comment.deleted;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await addComment(postId, replyText.trim(), comment.id);
    setReplyText('');
    setReplyOpen(false);
  };

  const handleEdit = () => {
    setEditText(comment.body);
    setEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    await editComment(postId, comment.id, editText.trim());
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteComment(postId, comment.id);
    setConfirmDelete(false);
  };

  return (
    <div className={`comment-node ${depth > 0 ? 'comment-nested' : ''}`}
      style={{ '--depth': Math.min(depth, 6) }}>

      <div className="comment-thread-line"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand' : 'Collapse'} />

      <div className="comment-inner">
        <div className="comment-header">
          <div className="comment-avatar">
            {isDeleted ? '?' : comment.author[0].toUpperCase()}
          </div>
          <strong className="comment-author">
            {isDeleted ? '[deleted]' : `u/${comment.author}`}
          </strong>
          <span className="comment-time">
            · {comment.createdAt
              ? formatDistanceToNow(new Date(comment.createdAt))
              : 'just now'} ago
          </span>
          {comment.editedAt && !isDeleted && (
            <span className="edited-badge">edited</span>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {!collapsed && (
          <>
            {editing ? (
              <form className="edit-comment-form" onSubmit={handleSaveEdit}>
                <MarkdownEditor
                  value={editText}
                  onChange={setEditText}
                  rows={3}
                />
                <div className="edit-comment-actions">
                  <button type="button" className="btn-cancel-edit"
                    onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn-save-edit">Save</button>
                </div>
              </form>
            ) : (
              <>
                {isDeleted ? (
                  <p className="comment-deleted">[deleted]</p>
                ) : (
                  <MarkdownRenderer content={comment.body} />
                )}

                <div className="comment-actions">
                  {!isDeleted && (
                    <>
                      <button className={`vote-inline up ${voted === 1 ? 'active' : ''}`}
                        onClick={() => voteComment(postId, comment.id, voted === 1 ? 0 : 1)}>
                        <ArrowUp size={13} />
                      </button>
                      <span className={`vote-inline-count ${voted !== 0 ? 'voted' : ''}`}>
                        {comment.votes}
                      </span>
                      <button className={`vote-inline down ${voted === -1 ? 'active' : ''}`}
                        onClick={() => voteComment(postId, comment.id, voted === -1 ? 0 : -1)}>
                        <ArrowDown size={13} />
                      </button>
                    </>
                  )}

                  {user && !isDeleted && (
                    <button className="reply-btn" onClick={() => setReplyOpen(!replyOpen)}>
                      <MessageSquare size={13} /> Reply
                    </button>
                  )}

                  {isAuthor && !isDeleted && (
                    <>
                      <button className="author-action-btn edit" onClick={handleEdit}>
                        <Pencil size={12} /> Edit
                      </button>
                      {confirmDelete ? (
                        <InlineConfirm
                          message="Delete comment?"
                          onConfirm={handleDelete}
                          onCancel={() => setConfirmDelete(false)}
                        />
                      ) : (
                        <button className="author-action-btn delete"
                          onClick={() => setConfirmDelete(true)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </>
                  )}

                  {replies.length > 0 && (
                    <span className="reply-count">
                      {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </div>
              </>
            )}

            {replyOpen && (
              <form className="inline-reply-form" onSubmit={handleReply}>
                <MarkdownEditor
                  value={replyText}
                  onChange={setReplyText}
                  placeholder={`Replying to u/${comment.author}…`}
                  rows={3}
                />
                <div className="inline-reply-actions">
                  <button type="button" className="btn-cancel-reply"
                    onClick={() => { setReplyOpen(false); setReplyText(''); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-reply"
                    disabled={!replyText.trim()}>
                    Reply
                  </button>
                </div>
              </form>
            )}

            {replies.length > 0 && (
              <div className="replies-container">
                {replies.map(reply => (
                  <CommentNode
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    allComments={allComments}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CommentThread({ postId, comments }) {
  const topLevel = comments.filter(c => !c.parentId);
  return (
    <div className="comment-thread">
      {topLevel.map(comment => (
        <CommentNode
          key={comment.id}
          comment={comment}
          postId={postId}
          allComments={comments}
          depth={0}
        />
      ))}
    </div>
  );
}