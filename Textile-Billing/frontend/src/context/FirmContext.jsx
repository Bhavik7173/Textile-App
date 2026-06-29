import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { firmAPI } from '../services/api';

const FirmContext = createContext(null);

export function FirmProvider({ children }) {
  const [firms, setFirms]           = useState([]);
  const [activeFirm, setActiveFirm] = useState(null);
  const [loading, setLoading]       = useState(true);
  const fetchedRef                  = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    firmAPI.list()
      .then(({ data }) => {
        setFirms(data.firms);
        const savedId = localStorage.getItem('activeFirmId');
        const found   = data.firms.find(f => f._id === savedId);
        setActiveFirm(found || data.firms[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const switchFirm = (firm) => {
    setActiveFirm(firm);
    localStorage.setItem('activeFirmId', firm._id);
  };

  const refreshFirms = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const { data } = await firmAPI.list();
    setFirms(data.firms);
    const updated = data.firms.find(f => f._id === activeFirm?._id);
    if (updated) setActiveFirm(updated);
  };

  return (
    <FirmContext.Provider value={{ firms, activeFirm, switchFirm, refreshFirms, loading }}>
      {children}
    </FirmContext.Provider>
  );
}

export const useFirm = () => useContext(FirmContext);
