import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useRegionFilter() {
  const { userRegionId, isSuperAdmin } = useAuth();
  const [filter, setFilter] = useState({
    regionId: null,
    workstation: '',
    payPoint: ''
  });
  const [workstations, setWorkstations] = useState([]);
  const [loadingWorkstations, setLoadingWorkstations] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin && userRegionId) {
      setFilter(prev => ({ ...prev, regionId: userRegionId }));
    }
  }, [userRegionId, isSuperAdmin]);

  const fetchWorkstations = async (regionId) => {
    setLoadingWorkstations(true);
    try {
      let query = supabase.from('employees').select('workstation');
      if (regionId) {
        query = query.eq('region_id', regionId);
      }
      const { data, error } = await query;
      if (!error && data) {
        const uniqueWorkstations = [...new Set(data.map(e => e.workstation).filter(Boolean))];
        setWorkstations(uniqueWorkstations.sort());
      }
    } catch (err) {
      console.error('Error fetching workstations:', err);
    } finally {
      setLoadingWorkstations(false);
    }
  };

  useEffect(() => {
    fetchWorkstations(filter.regionId);
  }, [filter.regionId]);

  return {
    filter,
    setFilter,
    workstations,
    loadingWorkstations,
    isSuperAdmin
  };
}