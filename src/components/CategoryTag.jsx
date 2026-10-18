import React from 'react';
import { Link } from 'react-router-dom';
import { forumCategory, categoryPath } from '../data/forumCategories';

// A post's category tag. Forum categories link to their category page;
// Playground posts show their post type as plain text.
export default function CategoryTag({ post }) {
  const label = post.playgroundType || post.category;
  const category = !post.playground && forumCategory(post.category);
  return category
    ? <Link to={categoryPath(category.id)} className={`tag tag-${post.category}`}>{label}</Link>
    : <span className={`tag tag-${post.category}`}>{label}</span>;
}
