import React from 'react';
import './InlineConfirm.css';

export default function InlineConfirm({ message = 'Are you sure?', onConfirm, onCancel }) {
  return (
    <span className="inline-confirm">
      <span className="inline-confirm-msg">{message}</span>
      <button className="inline-confirm-yes" onClick={onConfirm}>Yes, delete</button>
      <button className="inline-confirm-cancel" onClick={onCancel}>Cancel</button>
    </span>
  );
}