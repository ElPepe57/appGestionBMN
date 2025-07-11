// useExchangeRate.js - Versión con cache inteligente y actualización en tiempo real
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config';

export const useExchangeRate = () => {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFromAPI = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data && data.rates && data.rates.PEN) {
        const currentRate = data.rates.PEN;
        
        // Guardar en Firestore
        await addDoc(collection(db, 'exchange_rates'), {
          date: serverTimestamp(),
          rateUSD_to_PEN: currentRate,
          source: 'exchangerate-api.com',
          fetchedAt: new Date()
        });
        
        console.log('Nuevo tipo de cambio obtenido:', currentRate);
        return currentRate;
      }
      throw new Error('Respuesta inválida de la API');
    } catch (error) {
      console.error('Error al obtener tipo de cambio de la API:', error);
      throw error;
    }
  };

  const getExchangeRate = async () => {
    try {
      // Primero, verificar si hay un tipo de cambio reciente (última hora)
      const ratesRef = collection(db, 'exchange_rates');
      const q = query(ratesRef, orderBy('date', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const lastRate = snapshot.docs[0].data();
        const lastRateDate = lastRate.date?.toDate?.() || new Date(0);
        const hoursSinceLastRate = (new Date() - lastRateDate) / (1000 * 60 * 60);
        
        // Si el último tipo de cambio tiene menos de 1 hora, usarlo
        if (hoursSinceLastRate < 1) {
          console.log('Usando tipo de cambio en cache:', lastRate.rateUSD_to_PEN);
          setRate(lastRate.rateUSD_to_PEN);
          setLoading(false);
          return;
        }
      }
      
      // Si no hay tipo de cambio reciente, obtener uno nuevo
      console.log('Obteniendo nuevo tipo de cambio...');
      const newRate = await fetchFromAPI();
      setRate(newRate);
      setLoading(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err);
      // Intentar usar el último tipo de cambio disponible como fallback
      try {
        const ratesRef = collection(db, 'exchange_rates');
        const q = query(ratesRef, orderBy('date', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const lastRate = snapshot.docs[0].data();
          console.log('Usando último tipo de cambio disponible como fallback:', lastRate.rateUSD_to_PEN);
          setRate(lastRate.rateUSD_to_PEN);
        } else {
          // Si no hay ningún tipo de cambio, usar valor por defecto
          console.log('Usando tipo de cambio por defecto');
          setRate(3.75);
        }
      } catch (fallbackError) {
        console.error('Error en fallback:', fallbackError);
        setRate(3.75);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    getExchangeRate();
  }, []);

  const refreshRate = async () => {
    setLoading(true);
    try {
      const newRate = await fetchFromAPI();
      setRate(newRate);
      setError(null);
    } catch (err) {
      console.error('Error al actualizar:', err);
      setError(err);
    }
    setLoading(false);
    return rate;
  };

  return { rate, loading, error, refreshRate };
};