"use client";
import React, { useEffect, useState } from 'react';
import Toast from '../roles/Toast';
import ConfirmModal from '../roles/ConfirmModal';
import '../roles/roles.css';
import UserProfile from '../components/UserProfile';
import DynamicMenu from '../components/DynamicMenu';
import { useMenuGeneration } from '../hooks/useMenuGeneration';

interface Rol { _id?: string; nombre: string }
interface Usuario { _id?: string; nombre: string; apellido: string; email: string; cedula: string; tipoUsuario?: string; estado?: string; roles?: Rol[] }

function getAuthHeaders(): Record<string,string> {
  try {
    const raw = localStorage.getItem('token');
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (!raw) return headers;
    let tokenValue: string | null = null;
    try { const parsed = JSON.parse(raw); tokenValue = parsed?.token || (typeof parsed === 'string' ? parsed : null); } catch { tokenValue = raw; }
    if (tokenValue) headers['Authorization'] = `Bearer ${tokenValue}`;
    return headers;
  } catch { return { 'Content-Type':'application/json' }; }
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [toast, setToast] = useState<{message:string,type:'success'|'error'}|null>(null);
  const [error, setError] = useState<string|null>(null);

  const [editing, setEditing] = useState<Usuario|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string|null>(null);
  
  const { loading: permissionsLoading, canAccess, canCreate, canUpdate, canDelete } = useMenuGeneration();

  useEffect(() => { 
    if (!permissionsLoading) {
      if (canAccess('usuarios')) {
        load(); 
        loadRoles();
      } else {
        setLoading(false);
        setError('No tienes permisos para acceder a la gestión de usuarios');
      }
    }
  }, [permissionsLoading]);

  // Si no tiene permisos, mostrar mensaje de error
  if (!permissionsLoading && !canAccess('usuarios')) {
    return (
      <div className="roles-page" style={{ padding: 28 }}>
        <aside style={{ position: 'sticky', top: 24 }}>
          <DynamicMenu />
        </aside>
        <main className="roles-main">
          <div style={{ padding: 0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2>Usuarios</h2>
              <div><UserProfile /></div>
            </div>
            <div className="message error">
              No tienes permisos para acceder a la gestión de usuarios. 
              Por favor contacta al administrador del sistema.
            </div>
          </div>
        </main>
      </div>
    );
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/usuarios');
      const j = await res.json();
      if (res.ok && j.success) {
        const u = j.data?.usuarios || j.data || [];
        setUsuarios(u);
      } else {
        setError(j.message || 'Error cargando usuarios');
      }
    } catch (e: any) { setError(e?.message || 'Error de red'); }
    finally { setLoading(false); }
  }

  async function loadRoles() {
    try {
      const res = await fetch('/api/roles');
      const j = await res.json();
      if (res.ok && j.success) setRoles(j.data || []);
    } catch (e) {}
  }

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (u: Usuario) => { setEditing(u); setShowForm(true); };

  const saveUser = async (payload: any) => {
    setError(null);
    const headers = getAuthHeaders();
    try {
      let res;
      if (payload._id) res = await fetch(`/api/usuarios/${payload._id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      else res = await fetch('/api/usuarios', { method: 'POST', headers, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok || !j.success) { setToast({ message: j.message || 'Error', type: 'error' }); throw new Error(j.message || 'Error'); }
      setToast({ message: payload._id ? 'Usuario actualizado' : 'Usuario creado', type: 'success' });
      setShowForm(false); setEditing(null); await load();
    } catch (e: any) { setError(e?.message || 'Error'); }
  };

  const askDelete = (id?: string) => { if (!id) return; setToDelete(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!toDelete) return; setConfirmOpen(false);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/usuarios/${toDelete}`, { method: 'DELETE', headers });
      const j = await res.json();
      if (!res.ok || !j.success) { setToast({ message: j.message || 'Error eliminando', type: 'error' }); throw new Error(j.message || 'Error'); }
      setToast({ message: 'Usuario eliminado', type: 'success' });
      await load();
    } catch (e: any) { setError(e?.message || 'Error eliminando'); }
    finally { setToDelete(null); }
  };

  // Construir menú dinámico basado en permisos
  return (
    <div className="roles-page" style={{ padding: 28 }}>
      <aside style={{ position: 'sticky', top: 24 }}>
        <DynamicMenu />
      </aside>

      <main className="roles-main">
        <div style={{ padding: 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <h2>Usuarios</h2>
            <div>
              <UserProfile />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn primary" onClick={openCreate}>Nuevo Usuario</button>
          </div>

          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          {error && <div className="message error">{error}</div>}

          {loading ? <div>Cargando usuarios...</div> : (
            <table className="roles-table">
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Cédula</th><th>Tipo</th><th>Roles</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u._id}> 
                    <td>{u.nombre} {u.apellido}</td>
                    <td>{u.email}</td>
                    <td>{u.cedula}</td>
                    <td>{u.tipoUsuario}</td>
                    <td>{(u.roles||[]).map((r:any)=>r.nombre).join(', ')}</td>
                    <td>
                      <button className="btn ghost" onClick={() => openEdit(u)}>Editar</button>
                      <button className="btn danger" onClick={() => askDelete(u._id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Modal simple para crear/editar */}
          {showForm && (
            <div className="fs-modal-overlay" role="dialog" aria-modal="true" onClick={() => { setShowForm(false); setEditing(null); }}>
              <div className="fs-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-icon">👤</span>
                  <h3 style={{ margin: 0, flex: 1, textAlign: 'left' }}>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                  <button className="close-btn" onClick={() => { setShowForm(false); setEditing(null); }} aria-label="Cerrar">&times;</button>
                </div>
                <div className="modal-body">
                  <div className="left">
                    <div style={{ padding: 8, color: '#64748b', fontWeight: 600 }}>Roles</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {roles.map(r => (
                        <label key={r._id} style={{ padding: '6px 8px' }}>
                          <input type="checkbox" defaultChecked={!!(editing && (editing.roles||[]).find(rr=>rr._id===r._id))} id={`role-${r._id}`} /> {r.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="right">
                    <UserForm initial={editing} roles={roles} onCancel={() => { setShowForm(false); setEditing(null); }} onSave={saveUser} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal open={confirmOpen} message="¿Está seguro que desea eliminar este usuario?" onConfirm={confirmDelete} onCancel={() => setConfirmOpen(false)} />
        </div>
      </main>
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, roles }: { initial?: Usuario|null; roles: Rol[]; onSave: (u:any)=>Promise<void>; onCancel: ()=>void }) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [apellido, setApellido] = useState(initial?.apellido || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [cedula, setCedula] = useState(initial?.cedula || '');
  const [tipoUsuario] = useState(initial?.tipoUsuario || 'interventor');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // gather checked roles from DOM
      const checkedRoles: string[] = [];
      roles.forEach(r => { const el = document.getElementById(`role-${r._id}`) as HTMLInputElement | null; if (el && el.checked) checkedRoles.push(r._id as string); });

      // derive tipoUsuario from selected role names (priority)
      let derivedTipo = 'interventor';
      const selectedRoleNames = roles.filter(r => checkedRoles.includes(r._id as string)).map(r => (r.nombre || '').toLowerCase());
      if (selectedRoleNames.includes('administrador') || selectedRoleNames.includes('super administrador')) derivedTipo = 'administrador';
      else if (selectedRoleNames.includes('supervisor')) derivedTipo = 'supervisor';
      else if (selectedRoleNames.includes('interventor')) derivedTipo = 'interventor';
      else if (selectedRoleNames.includes('contratista')) derivedTipo = 'contratista';

      const payload: any = { nombre, apellido, email, cedula, tipoUsuario: derivedTipo };
      if (password) payload.password = password;
      if (initial && initial._id) payload._id = initial._id;
      if (checkedRoles.length) payload.roles = checkedRoles;
      await onSave(payload);
    } catch (e) {}
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-row"><label>Nombre</label><input value={nombre} onChange={e=>setNombre(e.target.value)} /></div>
      <div className="form-row"><label>Apellido</label><input value={apellido} onChange={e=>setApellido(e.target.value)} /></div>
      <div className="form-row"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="form-row"><label>Cédula</label><input value={cedula} onChange={e=>setCedula(e.target.value)} /></div>
      <div className="form-row"><label>Contraseña</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={initial? 'Dejar en blanco para no cambiar':''} /></div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:12 }}>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
}
