import { useState, useEffect } from 'react';
import { Search, Shield, MapPin, Download, Edit2, Trash2, UserPlus, X } from 'lucide-react';
import { Card, Button, Badge, THead, TBody, TR, TH, TD, Modal, PageHeader, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { showNotification } from '../utils/clickHandlers';

export function SecurityPage() {
  const [securityData, setSecurityData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const sitesList = [
    'Reserve Bank of Malawi', 'Illovo Sugar HQ', 'NBS Bank Towers', 'Standard Bank Plaza',
    'Old Mutual Centre', 'Mzuzu Coffee Estates', 'Castel Brewery', 'Sunbird Capital Hotel'
  ];
  const shiftsList = ['Morning (06-14)', 'Afternoon (14-22)', 'Night (22-06)', '24hr Rotation'];
  const supervisorsList = ['William Banda', 'Agnes Phiri', 'John Mwanza', 'Felix Soko'];

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or('position.ilike.%guard%,position.ilike.%security%,position.ilike.%officer%,position.ilike.%patrol%');
      
      if (error) throw error;
      
      const enhancedData = (data || []).map((emp: any, i: number) => ({
        id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        position: emp.position,
        status: emp.status || 'Active',
        phone: emp.phone || '',
        deploymentSite: sitesList[i % sitesList.length],
        shift: shiftsList[i % shiftsList.length],
        supervisor: supervisorsList[i % supervisorsList.length],
        licenseStatus: i % 20 === 0 ? 'Expiring' : 'Valid',
        uniformStatus: 'Issued',
        guardId: `G-${String(100 + i).slice(1)}`
      }));
      
      setSecurityData(enhancedData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = securityData.filter(e => 
    e.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    e.position?.toLowerCase().includes(search.toLowerCase()) ||
    e.deploymentSite?.toLowerCase().includes(search.toLowerCase()) ||
    e.supervisor?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddGuard = (newGuard: any) => {
    const newId = Date.now().toString();
    const guard = {
      id: newId,
      full_name: newGuard.fullName,
      employee_number: newGuard.employeeNumber || `SG-${Math.floor(Math.random() * 10000)}`,
      position: newGuard.position,
      status: 'Active',
      phone: newGuard.phone || '',
      deploymentSite: newGuard.deploymentSite,
      shift: newGuard.shift,
      supervisor: newGuard.supervisor,
      licenseStatus: 'Valid',
      uniformStatus: 'Issued',
      guardId: newGuard.guardId || `G-${Math.floor(Math.random() * 1000)}`
    };
    setSecurityData([guard, ...securityData]);
    showNotification(`${newGuard.fullName} added to security personnel`, 'success');
    setShowAddModal(false);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const saveEdit = () => {
    if (editingItem) {
      setSecurityData(securityData.map(item => item.id === editingItem.id ? editingItem : item));
      showNotification(`${editingItem.full_name} updated successfully`, 'success');
      setShowEditModal(false);
      setEditingItem(null);
    }
  };

  const handleDelete = (item: any) => {
    if (confirm(`Are you sure you want to remove ${item.full_name} from security personnel?`)) {
      setSecurityData(securityData.filter(i => i.id !== item.id));
      showNotification(`${item.full_name} removed from security personnel`, 'success');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Guard ID', 'Full Name', 'Position', 'Deployment Site', 'Shift', 'Supervisor', 'License Status', 'Uniform', 'Status'],
      ...filtered.map(g => [
        g.guardId,
        g.full_name,
        g.position,
        g.deploymentSite,
        g.shift,
        g.supervisor,
        g.licenseStatus,
        g.uniformStatus,
        g.status
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security_personnel_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${filtered.length} security personnel`, 'success');
  };

  const AddGuardModal = () => {
    const [formData, setFormData] = useState({
      fullName: '',
      employeeNumber: '',
      position: 'Security Guard',
      phone: '',
      deploymentSite: sitesList[0],
      shift: shiftsList[0],
      supervisor: supervisorsList[0],
      guardId: ''
    });

    return (
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Security Guard" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={formData.fullName} onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} required />
            <Input label="Guard ID" value={formData.guardId} onChange={(e: any) => setFormData({...formData, guardId: e.target.value})} />
            <Input label="Employee Number" value={formData.employeeNumber} onChange={(e: any) => setFormData({...formData, employeeNumber: e.target.value})} />
            <Input label="Phone" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={formData.position} onChange={(e: any) => setFormData({...formData, position: e.target.value})}>
              <option>Security Guard</option><option>Senior Security Officer</option><option>Patrol Officer</option><option>K9 Handler</option>
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={formData.deploymentSite} onChange={(e: any) => setFormData({...formData, deploymentSite: e.target.value})}>
              {sitesList.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={formData.shift} onChange={(e: any) => setFormData({...formData, shift: e.target.value})}>
              {shiftsList.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={formData.supervisor} onChange={(e: any) => setFormData({...formData, supervisor: e.target.value})}>
              {supervisorsList.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="secondary" onClick={() => handleAddGuard(formData)} disabled={!formData.fullName}>Add Guard</Button>
        </div>
      </Modal>
    );
  };

  const EditGuardModal = () => {
    if (!editingItem) return null;
    
    return (
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Security Guard" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={editingItem.full_name} onChange={(e: any) => setEditingItem({...editingItem, full_name: e.target.value})} />
            <Input label="Guard ID" value={editingItem.guardId} onChange={(e: any) => setEditingItem({...editingItem, guardId: e.target.value})} />
            <Input label="Phone" value={editingItem.phone || ''} onChange={(e: any) => setEditingItem({...editingItem, phone: e.target.value})} />
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={editingItem.position} onChange={(e: any) => setEditingItem({...editingItem, position: e.target.value})}>
              <option>Security Guard</option><option>Senior Security Officer</option><option>Patrol Officer</option><option>K9 Handler</option>
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={editingItem.deploymentSite} onChange={(e: any) => setEditingItem({...editingItem, deploymentSite: e.target.value})}>
              {sitesList.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={editingItem.shift} onChange={(e: any) => setEditingItem({...editingItem, shift: e.target.value})}>
              {shiftsList.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={editingItem.supervisor} onChange={(e: any) => setEditingItem({...editingItem, supervisor: e.target.value})}>
              {supervisorsList.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={editingItem.licenseStatus} onChange={(e: any) => setEditingItem({...editingItem, licenseStatus: e.target.value})}>
              <option>Valid</option><option>Expiring</option><option>Expired</option>
            </select>
            <select className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" value={editingItem.status} onChange={(e: any) => setEditingItem({...editingItem, status: e.target.value})}>
              <option>Active</option><option>On Leave</option><option>Suspended</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="secondary" onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading security personnel...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Security Personnel"
        subtitle="Dedicated module for guard deployment, shifts, and licensing"
        actions={
          <>
            <Button variant="outline" onClick={handleExport}><Download size={16} /> Export</Button>
            <Button variant="secondary" onClick={() => setShowAddModal(true)}><UserPlus size={16} /> Add Guard</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Active Guards', n: securityData.filter(g => g.status === 'Active').length, sub: 'On duty now' },
          { l: 'Deployment Sites', n: [...new Set(securityData.map(g => g.deploymentSite))].length, sub: 'Across Malawi' },
          { l: 'Licenses Valid', n: securityData.filter(g => g.licenseStatus === 'Valid').length, sub: `${securityData.filter(g => g.licenseStatus === 'Expiring').length} expiring soon` },
          { l: 'Uniforms Issued', n: securityData.filter(g => g.uniformStatus === 'Issued').length, sub: 'Full kit provided' }
        ].map((s, i) => (
          <Card key={i} className="p-5">
            <p className="text-xs text-slate-500">{s.l}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{s.n}</p>
            <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guards by name, site, or supervisor..." className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" />
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}>
                <TH>Guard</TH>
                <TH>Guard ID</TH>
                <TH className="hidden md:table-cell">Deployment Site</TH>
                <TH className="hidden lg:table-cell">Supervisor</TH>
                <TH className="hidden md:table-cell">Shift</TH>
                <TH>License</TH>
                <TH className="hidden md:table-cell">Uniform</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.slice(0, 25).map((emp, i) => (
                <TR key={emp.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#081C3A] text-white text-xs font-bold flex items-center justify-center"><Shield size={14} /></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
                        <p className="text-xs text-slate-500">{emp.position}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="font-mono text-xs">{emp.guardId || emp.employee_number}</TD>
                  <TD className="hidden md:table-cell text-xs">{emp.deploymentSite}</TD>
                  <TD className="hidden lg:table-cell text-xs">{emp.supervisor}</TD>
                  <TD className="hidden md:table-cell text-xs">{emp.shift}</TD>
                  <TD>
                    <Badge color={emp.licenseStatus === 'Expiring' ? 'yellow' : 'green'}>
                      {emp.licenseStatus}
                    </Badge>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <Badge color="blue">Issued</Badge>
                  </TD>
                  <TD><Badge color={emp.status === 'Active' ? 'green' : 'yellow'}>{emp.status}</Badge></TD>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEdit(emp)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-amber-600 flex items-center justify-center"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(emp)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </TBody>
          </table>
        </div>
      </div>

      {/* Future deployment site info */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Deployment Sites Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sitesList.slice(0, 8).map((site, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 hover:border-[#081C3A] transition-colors">
              <MapPin size={18} className="text-[#D4A017] mb-2" />
              <p className="font-semibold text-slate-800 text-sm">{site}</p>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-slate-500">Guards: {securityData.filter(g => g.deploymentSite === site).length}</span>
                <Badge color="navy">Active</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AddGuardModal />
      <EditGuardModal />
    </div>
  );
}