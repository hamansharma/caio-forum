import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { allCanvasYears } from '../data/timeCapsule';

// The member's AI Time Capsule predictions across every canvas, soonest review
// first, with their sealed text (members can always read their own). Two small
// queries per canvas, which need no extra Firestore index. null while loading.
export default function useMyPredictions(uid) {
  const [predictions, setPredictions] = useState(null);
  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    const mine = (year, name) => getDocs(query(collection(db, 'timeCapsules', String(year), name), where('authorUid', '==', uid)));
    Promise.all(allCanvasYears().map(year => Promise.all([mine(year, 'predictions'), mine(year, 'sealed')])))
      .then(results => {
        if (cancelled) return;
        const list = results.flatMap(([predictions, sealed]) => {
          const texts = Object.fromEntries(sealed.docs.map(item => [item.id, item.get('text')]));
          return predictions.docs.map(item => ({ cell: item.id, ...item.data(), text: texts[item.id] || '' }));
        });
        list.sort((a, b) => a.year - b.year || String(b.createdAt).localeCompare(String(a.createdAt)));
        setPredictions(list);
      })
      .catch(() => { if (!cancelled) setPredictions([]); });
    return () => { cancelled = true; };
  }, [uid]);
  return predictions;
}
