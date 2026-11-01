import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { allCanvasYears } from '../data/timeCapsule';

// The member's AI Time Capsule predictions across every canvas, soonest review
// first. One small query per canvas (14), which needs no extra Firestore index.
// null while loading.
export default function useMyPredictions(uid) {
  const [predictions, setPredictions] = useState(null);
  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    Promise.all(allCanvasYears().map(year =>
      getDocs(query(collection(db, 'timeCapsules', String(year), 'predictions'), where('authorUid', '==', uid)))))
      .then(snapshots => {
        if (cancelled) return;
        const list = snapshots.flatMap(snapshot => snapshot.docs.map(item => ({ cell: item.id, ...item.data() })));
        list.sort((a, b) => a.year - b.year || String(b.createdAt).localeCompare(String(a.createdAt)));
        setPredictions(list);
      })
      .catch(() => { if (!cancelled) setPredictions([]); });
    return () => { cancelled = true; };
  }, [uid]);
  return predictions;
}
