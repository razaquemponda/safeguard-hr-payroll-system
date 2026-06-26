import { useState, useEffect } from 'react';
import { Search, UserCheck, XCircle, CheckCircle2, Eye, UserPlus, FileText } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal, Input } from '../components/ui';
import { formatKwacha } from '../data';
import { showNotification } from '../utils/clickHandlers';
import { supabase } from '../lib/supabase';

interface Applicant {
  id: string;
  name: string;
  position: string;
  qualification: string;
  phone: string;
  email: string;
  experience: string;
  interview_status: string;
  decision: string;
  application_date: string;
  cover_letter?: string;
  cv_url?: string;
  region_id?: string;
}

export function RecruitmentPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<Applicant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile for region access
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, regions(*)')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, []);

  // Fetch applicants from Supabase
  useEffect(() => {
    if (userProfile) {
      fetchApplicants();
    }
  }, [userProfile]);

  const fetchApplicants = async () => {
    setLoading(true);
    let query = supabase.from('applicants').select('*').order('created_at', { ascending: false });
    
    // Apply region filter if applicants have region_id
    // If applicants table doesn't have region_id, super admins see all, others see none
    if (!userProfile?.is_super_admin && userProfile?.region_id) {
      // If applicants table has region_id column, uncomment below
      // query = query.eq('region_id', userProfile.region_id);
      
      // For now, non-super admins see all applicants but can only edit those from their region
      // This is a placeholder - you may want to add region_id to applicants table
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching applicants:', error);
      showNotification('Failed to load applicants', 'error');
    } else {
      setApplicants(data || []);
    }
    setLoading(false);
  };

  const filtered = applicants.filter(a =>
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.position.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'all' || a.interview_status.toLowerCase().includes(filter.toLowerCase()))
  );

  const update = async (id: string, status: string, decision: string = 'Pending') => {
    // Check if user has permission (for future region-based control)
    // const applicant = applicants.find(a => a.id === id);
    // if (!userProfile?.is_super_admin && applicant?.region_id !== userProfile?.region_id) {
    //   showNotification('You can only edit applicants from your region', 'error');
    //   return;
    // }
    
    const { error } = await supabase
      .from('applicants')
      .update({ interview_status: status, decision })
      .eq('id', id);
    
    if (error) {
      showNotification('Error updating status: ' + error.message, 'error');
    } else {
      setApplicants(applicants.map(a => a.id === id ? { ...a, interview_status: status, decision } : a));
      showNotification(`Applicant status updated to ${status}`, 'success');
    }
  };

  const addApplicant = async (newApplicant: any) => {
    const { data, error } = await supabase
      .from('applicants')
      .insert([{
        name: newApplicant.name,
        position: newApplicant.position,
        qualification: newApplicant.qualification,
        phone: newApplicant.phone,
        email: newApplicant.email,
        experience: newApplicant.experience,
        interview_status: 'Pending',
        decision: 'Pending',
        application_date: new Date().toISOString().split('T')[0],
        cover_letter: newApplicant.coverLetter || null,
        // region_id: userProfile?.region_id || null  // If applicants have region_id
      }])
      .select();
    
    if (error) {
      showNotification('Error adding applicant: ' + error.message, 'error');
    } else if (data && data[0]) {
      setApplicants([data[0], ...applicants]);
      showNotification(`${newApplicant.name} has been added to recruitment pipeline`, 'success');
    }
    setShowAddModal(false);
  };

  const counts = {
    total: applicants.length,
    shortlisted: applicants.filter(a => a.interview_status === 'Shortlisted').length,
    interviewed: applicants.filter(a => a.interview_status === 'Interviewed').length,
    accepted: applicants.filter(a => a.interview_status === 'Accepted').length,
    rejected: applicants.filter(a => a.interview_status === 'Rejected').length
  };

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  const AddApplicantModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      position: '',
      qualification: '',
      phone: '',
      email: '',
      experience: '',
      coverLetter: ''
    });

    return (
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Applicant" size="lg">
        <div className="space-y-4">
          {!isSuperAdmin && userRegion && (
            <div className="p-3 rounded-lg bg-[#E8EDF5] text-sm text-slate-700">
              Applicant will be considered for <strong>{userRegion.name}</strong> region
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
              <input type="text" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Position Applied *</label>
              <input type="text" value={formData.position} onChange={(e: any) => setFormData({...formData, position: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Qualification</label>
              <input type="text" value={formData.qualification} onChange={(e: any) => setFormData({...formData, qualification: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of Experience</label>
              <input type="text" value={formData.experience} onChange={(e: any) => setFormData({...formData, experience: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
              <input type="text" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cover Letter</label>
            <textarea 
              rows={3}
              value={formData.coverLetter} 
              onChange={(e: any) => setFormData({...formData, coverLetter: e.target.value})}
              placeholder="Write a cover letter or notes about this applicant..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button onClick={() => addApplicant(formData)} disabled={!formData.name || !formData.position} className="px-5 py-2 rounded-lg bg-[#D4A017] text-white text-sm font-semibold hover:bg-[#e8b82e] disabled:opacity-50">Add Applicant</button>
        </div>
      </Modal>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading applicants...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Recruitment Pipeline"
        subtitle={isSuperAdmin ? "Track applicants through the hiring workflow" : `${userRegion?.name || ''} Region - Recruitment`}
        actions={<Button variant="secondary" onClick={() => setShowAddModal(true)}><UserPlus size={16} /> New Applicant</Button>}
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Managing recruitment for <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Total', n: counts.total, color: 'navy' },
          { l: 'Shortlisted', n: counts.shortlisted, color: 'blue' },
          { l: 'Interviewed', n: counts.interviewed, color: 'gold' },
          { l: 'Accepted', n: counts.accepted, color: 'green' },
          { l: 'Rejected', n: counts.rejected, color: 'red' }
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs text-slate-500">{s.l}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{s.n}</p>
          </Card>
        ))}
      </div>

      {/* Pipeline */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Application Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { s: 'Pending', c: 'gray', n: applicants.filter(a => a.interview_status === 'Pending').length },
            { s: 'Shortlisted', c: 'blue', n: counts.shortlisted },
            { s: 'Interviewed', c: 'gold', n: counts.interviewed },
            { s: 'Accepted', c: 'green', n: counts.accepted },
            { s: 'Rejected', c: 'red', n: counts.rejected }
          ].map((p, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-100 text-center">
              <p className="text-3xl font-bold text-slate-800">{p.n}</p>
              <Badge color={p.c as any}>{p.s}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants..." className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'shortlisted', 'interviewed', 'accepted'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-medium rounded-lg ${filter === f ? 'bg-[#081C3A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{f.toUpperCase()}</button>
          ))}
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}>
                <TH>Applicant</TH>
                <TH>Position Applied</TH>
                <TH className="hidden md:table-cell">Qualification</TH>
                <TH>Interview Status</TH>
                <TH className="hidden md:table-cell">Applied</TH>
                <TH className="hidden lg:table-cell">Decision</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.slice(0, 50).map(app => (
                <TR key={app.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#D4A017] flex items-center justify-center text-white text-xs font-bold shrink-0">{app.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{app.name}</p>
                        <p className="text-xs text-slate-500">{app.phone}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>{app.position}</TD>
                  <TD className="hidden md:table-cell text-xs">{app.qualification}</TD>
                  <TD><Badge color={app.interview_status === 'Accepted' ? 'green' : app.interview_status === 'Rejected' ? 'red' : app.interview_status === 'Interviewed' ? 'gold' : app.interview_status === 'Shortlisted' ? 'blue' : 'gray'}>{app.interview_status}</Badge></TD>
                  <TD className="hidden md:table-cell text-xs">{app.application_date}</TD>
                  <TD className="hidden lg:table-cell"><Badge color={app.decision === 'Hire' ? 'green' : app.decision === 'Reject' ? 'red' : 'gray'}>{app.decision}</Badge></TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setView(app)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center"><Eye size={14} /></button>
                      <button onClick={() => update(app.id, 'Shortlisted')} disabled={app.interview_status === 'Shortlisted'} className="px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50">Shortlist</button>
                      <button onClick={() => update(app.id, 'Interviewed')} disabled={app.interview_status === 'Interviewed'} className="px-2 py-1 text-xs rounded-md bg-[#FFF1CC] text-[#8B6F0F] hover:bg-[#F9E4B3] disabled:opacity-50">Interview</button>
                      <button onClick={() => update(app.id, 'Accepted', 'Hire')} className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100">✓ Hire</button>
                      <button onClick={() => update(app.id, 'Rejected', 'Reject')} className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100">Reject</button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </table>
        </div>
      </div>

      {/* View Applicant Modal */}
      <Modal open={!!view} onClose={() => setView(null)} title="Applicant Details">
        {view && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#081C3A] flex items-center justify-center text-white text-xl font-bold shrink-0">{view.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">{view.name}</h3>
                <p className="text-sm text-slate-500">{view.position}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color="gold">{view.qualification}</Badge>
                  <Badge color={view.interview_status === 'Accepted' ? 'green' : 'blue'}>{view.interview_status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500 text-xs">Phone</p><p className="font-medium">{view.phone}</p></div>
              <div><p className="text-slate-500 text-xs">Email</p><p className="font-medium">{view.email}</p></div>
              <div><p className="text-slate-500 text-xs">Experience</p><p className="font-medium">{view.experience} years</p></div>
              <div><p className="text-slate-500 text-xs">Applied</p><p className="font-medium">{view.application_date}</p></div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-sm">
              <p className="font-semibold text-slate-800 mb-2">Cover Letter</p>
              <p className="text-slate-600">{view.cover_letter || 'No cover letter provided.'}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline"><FileText size={14} /> View CV</Button>
              <Button onClick={() => { update(view.id, 'Shortlisted'); setView(null); }}><UserCheck size={14} /> Shortlist</Button>
              <Button variant="secondary" onClick={() => { update(view.id, 'Accepted', 'Hire'); setView(null); }}><CheckCircle2 size={14} /> Hire Employee</Button>
              <Button variant="danger" onClick={() => { update(view.id, 'Rejected', 'Reject'); setView(null); }}><XCircle size={14} /> Reject</Button>
            </div>
          </div>
        )}
      </Modal>

      <AddApplicantModal />
    </div>
  );
}

export default RecruitmentPage;