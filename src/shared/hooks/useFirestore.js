// src/shared/hooks/useFirestore.js

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase-config'; // Asegúrate que la ruta sea correcta

export const useFirestore = (collectionName, queryConstraints = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0
      ? query(collectionRef, ...queryConstraints)
      : collectionRef;

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(documents);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints)]); // Dependencia para re-ejecutar si la query cambia

  return { data, loading, error };
};