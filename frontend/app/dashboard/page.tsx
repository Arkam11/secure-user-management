'use client';
import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import {
  Users, Plus, Search, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight, Shield, User
} from 'lucide-react';

interface UserData {
  id: string; email: string; firstName: string; lastName: string;
  role: 'admin' | 'user'; isActive: boolean; createdAt: string;
}

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', role: 'user' as 'admin' | 'user' };

export default function DashboardPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const limit = 8;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.getAll({ page, limit, search: search || undefined });
      setUsers(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (u: UserData) => {
    setEditUser(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editUser) {
        const payload: any = { firstName: form.firstName, lastName: form.lastName, role: form.role };
        if (form.password) payload.password = form.password;
        await usersApi.update(editUser.id, payload);
        toast.success('User updated!');
      } else {
        await usersApi.create(form);
        toast.success('User created!');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: UserData) => {
    if (!confirm(`Delete ${u.firstName} ${u.lastName}?`)) return;
    try {
      await usersApi.delete(u.id);
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const totalPages = Math.ceil(total / limit);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">{total} total users</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            style={{
              display:'flex',
              alignItems:'center',
              gap:'8px',
              background:'#2563eb',
              color:'white',
              padding:'10px 16px',
              borderRadius:'12px',
              fontWeight:600,
              border:'none',
              cursor:'pointer',
              fontSize:'14px',
              whiteSpace:'nowrap',
            }}
            onMouseOver={e => (e.currentTarget.style.background='#1d4ed8')}
            onMouseOut={e => (e.currentTarget.style.background='#2563eb')}
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

     {/* Search */}
      <div className="relative mb-4">
        <div style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:10}}>
          <Search className="w-4 h-4" style={{color:'#94a3b8'}} />
        </div>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          style={{
            width:'100%',
            paddingLeft:'40px',
            paddingRight:'16px',
            paddingTop:'12px',
            paddingBottom:'12px',
            background:'white',
            border:'1px solid #e2e8f0',
            borderRadius:'12px',
            outline:'none',
            color:'#1e293b',
            fontSize:'14px',
          }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                {isAdmin && <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                        <p className="text-slate-400 text-sm">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(u)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editUser ? 'Edit User' : 'Create User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="Doe" />
                </div>
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="user@example.com" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editUser ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  placeholder="Min 8 characters" minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors">
                {submitting ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}