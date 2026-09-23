import { useEffect } from 'react';

export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (descriptionTag) descriptionTag.setAttribute('content', description);
    if (ogDescription) ogDescription.setAttribute('content', description);
    if (ogTitle) ogTitle.setAttribute('content', title);
  }, [title, description]);
}
