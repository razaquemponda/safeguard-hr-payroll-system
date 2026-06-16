import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { useRegionFilter } from '../hooks/useRegionFilter';
import { supabase } from '../lib/supabase';
import { Button } from './ui';

const payPoints = [
  { value: 'national_bank', label: 'National Bank of Malawi' },
  { value: 'standard_bank', label: 'Standard Bank' },
  { value: 'nbs_bank', label: 'NBS Bank' },
  { value: 'centenary_bank', label: 'Centenary Bank' },
  { value: 'fdh_bank', label: 'FDH Bank' },
  { value: 'first_capital_bank', label: 'First Capital Bank' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'tnm_mpamba', label: 'TNM Mpamba' }
];

export function RegionFilterBar({ showWorkstation = true, showPayPoint = true }) {
  const { filter, setFilter, workstations, loadingWorkstations, isSuperAdmin } = useRegionFilter();
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    const { data } = await supabase.from('regions').select('*');
    setRegions(data || []);
  };

  const hasActiveFilters = filter.regionId || filter.workstation || filter.payPoint;

  const clearFilters = () => {
    setFilter({ regionId: null, workstation: '', payPoint: '' });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Filter size={14} /> Filter by Region
        </h4>
        {hasActiveFilters && (
          <Button variant="ghost" className="text-xs py-1 px-2" onClick={clearFilters} className="text-xs">
            <X size={12} className="mr-1" /> Clear all
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {isSuperAdmin && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
            <select
              value={filter.regionId || ''}
              onChange={(e) => setFilter({ ...filter, regionId: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] outline-none"
            >
              <option value="">All Regions</option>
              {regions.map(region => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {showWorkstation && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Workstation / Site</label>
            <select
              value={filter.workstation}
              onChange={(e) => setFilter({ ...filter, workstation: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] outline-none"
              disabled={loadingWorkstations}
            >
              <option value="">All Workstations</option>
              {workstations.map(ws => (
                <option key={ws} value={ws}>{ws}</option>
              ))}
            </select>
          </div>
        )}
        
        {showPayPoint && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pay Point</label>
            <select
              value={filter.payPoint}
              onChange={(e) => setFilter({ ...filter, payPoint: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] outline-none"
            >
              <option value="">All Pay Points</option>
              {payPoints.map(pp => (
                <option key={pp.value} value={pp.value}>{pp.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}