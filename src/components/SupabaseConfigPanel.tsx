import React, { useState } from 'react';
import { SupabaseConfig, UserProfile } from '../types';
import { Database, Shield, Key, Eye, EyeOff, Check, Copy, Settings, HelpCircle, Terminal, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SupabaseConfigPanelProps {
  config: SupabaseConfig;
  onSaveConfig: (url: string, key: string) => void;
  onResetConfig: () => void;
  activeUser: UserProfile | null;
  onSwitchUser: (user: UserProfile) => void;
  allUsers: UserProfile[];
  onAddCustomUser: (email: string, name: string, role: 'admin' | 'owner' | 'backer') => void;
}

export default function SupabaseConfigPanel({
  config,
  onSaveConfig,
  onResetConfig,
  activeUser,
  onSwitchUser,
  allUsers,
  onAddCustomUser,
}: SupabaseConfigPanelProps) {
  const [urlInput, setUrlInput] = useState(config.url || '');
  const [keyInput, setKeyInput] = useState(config.anonKey || '');
  const [showKey, setShowKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  
  // Custom user state
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState<'admin' | 'owner' | 'backer'>('backer');
  const [userError, setUserError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(urlInput.trim(), keyInput.trim());
  };

  const handleCopySql = () => {
    // Standard schema code matching /src/supabase_schema.sql
    const sqlCode = `-- -------------------------------------------------------------
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- Collaborative Crowdfunding Web/Mobile App
-- -------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- Create profiles table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text not null check (role in ('admin', 'owner', 'backer')) default 'backer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Create projects table with unique customizable text ID
create table if not exists public.projects (
  id text primary key, -- Custom short code / ID (e.g., 'BANOS-CLUB')
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null check (category in ('construction', 'party', 'event', 'other')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

-- Create components table (Itemized Requirements)
create table if not exists public.components (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  name text not null,
  unit_price numeric not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  remaining_quantity numeric not null check (remaining_quantity >= 0),
  funded_amount numeric not null default 0 check (funded_amount >= 0),
  allow_partial boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.components enable row level security;

-- Create contributions table (Backer funding events)
create table if not exists public.contributions (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  component_id uuid references public.components(id) on delete cascade not null,
  backer_id uuid references public.profiles(id) on delete set null,
  backer_email text not null,
  backer_name text not null,
  amount numeric not null check (amount > 0),
  quantity_bought numeric not null check (quantity_bought > 0),
  coupon_code text unique not null,
  company_alias text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contributions enable row level security;`;

    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customName) {
      setUserError('Por favor complete todos los campos.');
      return;
    }
    if (!customEmail.includes('@')) {
      setUserError('Por favor ingrese un email válido.');
      return;
    }
    onAddCustomUser(customEmail.trim(), customName.trim(), customRole);
    setCustomEmail('');
    setCustomName('');
    setUserError('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Intro Stats Bar */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-2xl shadow-md border border-blue-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5" /> Consola de Integración Supabase & Google Auth
            </h2>
            <p className="text-blue-100 text-xs mt-1">
              Configure su base de datos real o administre perfiles de acceso con Google Login simulado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-500/30 px-3 py-1.5 rounded-full font-semibold border border-blue-400/30 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${config.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {config.isConnected ? 'Conectado a Supabase' : 'Modo Persistencia Local'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Auth & Roles Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm tracking-wide uppercase">
              <Shield className="w-4 h-4 text-blue-600" /> Control de Acceso (Google Auth)
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Para probar los diferentes roles y permisos del sistema (<strong>Administrador</strong>, <strong>Dueño de Proyecto</strong> o <strong>Aportante</strong>), puede iniciar sesión simulando la cuenta de Google correspondiente.
            </p>

            <div className="space-y-2.5">
              {allUsers.map((u) => {
                const isActive = activeUser?.email === u.email;
                return (
                  <button
                    key={u.email}
                    onClick={() => onSwitchUser(u)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50/70 border-blue-400 shadow-xs' 
                        : 'bg-slate-50/50 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800">{u.full_name}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wide ${
                      u.role === 'admin' 
                        ? 'bg-red-50 text-red-600 border border-red-200' 
                        : u.role === 'owner' 
                          ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                    }`}>
                      {u.role === 'admin' ? 'ADMIN' : u.role === 'owner' ? 'OWNER' : 'BACKER'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Google Authentication Guide Info */}
            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 flex gap-2.5">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700">Cuenta de Administrador:</span>
                <p className="mt-0.5">El usuario <span className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded-xs text-slate-800">schaferdc@gmail.com</span> se asigna automáticamente como <strong className="text-red-600">ADMIN</strong> al iniciar sesión con Google y tiene acceso completo.</p>
              </div>
            </div>
          </div>

          {/* Real Google Login if connected */}
          {config.isConnected && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-xs border border-blue-100 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm tracking-wide uppercase">
                <LogIn className="w-4 h-4 text-blue-600 animate-pulse" /> Autenticación Real con Google
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ¡Tu base de datos está conectada! Ahora puedes iniciar sesión con tu cuenta real de Gmail de forma segura. El perfil se creará y se sincronizará automáticamente.
              </p>
              
              <button
                type="button"
                onClick={async () => {
                  if (!supabase) return;
                  try {
                    await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: window.location.origin
                      }
                    });
                  } catch (e: any) {
                    alert(`Error con Google Auth: ${e.message || e}`);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xs hover:shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 018 12.5a5.99 5.99 0 015.991-6.014c1.558 0 2.902.593 3.935 1.557l3.07-3.07C19.141 3.115 16.733 2 13.99 2 8.473 2 4 6.473 4 12s4.473 10 9.99 10c5.77 0 9.814-4.057 9.814-9.99 0-.6-.054-1.18-.15-1.725H12.24z"/>
                </svg>
                <span>Iniciar Sesión Real con Gmail</span>
              </button>

              {/* Guía detallada para activar Google Provider en Supabase */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2.5 text-xs text-amber-900 leading-relaxed mt-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-950 text-xs uppercase tracking-wide">
                  <span>🛠️ ¿Obtienes error "Unsupported provider" o "not enabled"?</span>
                </div>
                <p>
                  Por defecto, Supabase requiere que habilites manualmente el proveedor de Google en su panel de administración para poder usar la autenticación real:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-amber-900 font-medium">
                  <li>
                    Ingresa a tu <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-700">Consola de Supabase</a> y selecciona tu proyecto.
                  </li>
                  <li>
                    Ve a la pestaña <strong>Authentication</strong> en la barra lateral izquierda (ícono de llave o candado).
                  </li>
                  <li>
                    Haz clic en la opción <strong>Sign In / Providers</strong> (que está en el menú izquierdo bajo CONFIGURATION).
                  </li>
                  <li>
                    Busca <strong>Google</strong> en la lista y haz clic para expandirlo.
                  </li>
                  <li>
                    Activa la opción <strong>"Enable Google Provider"</strong> (Habilitar proveedor Google).
                  </li>
                  <li>
                    Ingresa tu <strong>Client ID</strong> y tu <strong>Client Secret</strong> (los cuales obtienes de tu consola de Google Cloud).
                  </li>
                  <li>
                    Copia la <strong>Redirect URI</strong> que te muestra Supabase y agrégala a las credenciales de tu proyecto en la Google Cloud Console.
                  </li>
                  <li>
                    Guarda los cambios en Supabase. ¡Listo! Ya podrás iniciar sesión de manera real.
                  </li>
                </ol>
                <div className="bg-amber-100/50 p-2.5 rounded-lg text-[10.5px] text-amber-950 font-semibold leading-relaxed border border-amber-200/50">
                  💡 <strong>¿No quieres configurar Google Cloud Console aún?</strong> No te preocupes. Puedes usar la <strong>simulación de Google Sign-In</strong> abajo en esta misma pantalla, o ingresar directamente tu correo en la pantalla de inicio. Funciona exactamente igual de bien con tu base de datos de Supabase.
                </div>
              </div>
            </div>
          )}

          {/* Simulate New User Creation */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3.5 text-sm tracking-wide uppercase">
              <LogIn className="w-4 h-4 text-blue-600" /> Simular Google Sign-In
            </h3>
            <form onSubmit={handleAddUserSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email de Gmail</label>
                <input
                  type="email"
                  placeholder="Ej. juan@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Rol Inicial</label>
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-blue-400"
                >
                  <option value="backer">Aportante (Backer)</option>
                  <option value="owner">Creador de Proyecto (Owner)</option>
                  <option value="admin">Administrador (Admin)</option>
                </select>
              </div>

              {userError && <p className="text-[11px] text-red-500">{userError}</p>}

              <button
                type="submit"
                className="w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-lg transition cursor-pointer"
              >
                Iniciar Sesión con Google
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: DB Integration & Code Setup */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Supabase Connection Details Form */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm tracking-wide uppercase">
              <Key className="w-4 h-4 text-blue-600" /> Conectar con tu Instancia de Supabase
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Si deseas persistir los proyectos directamente en tu base de datos de Supabase, ingresa las credenciales de tu proyecto. El sistema creará y actualizará los registros de forma remota.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  placeholder="https://xxxxxxxxx.supabase.co"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Supabase Anon Key</label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Guardar y Conectar
                </button>
                {config.url && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetConfig();
                      setUrlInput('');
                      setKeyInput('');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* SQL Exporter Card */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xs border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2 text-sm tracking-wide uppercase">
                  <Terminal className="w-4 h-4 text-emerald-400" /> Script SQL para Consola Supabase
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Copie este script y ejecútelo en el editor SQL de Supabase para inicializar las tablas necesarias.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white p-2 rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-1.5 text-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-60 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300">
              <span className="text-slate-500">-- Crear extensión de UUID</span><br />
              <span className="text-emerald-400">create extension</span> if not exists "uuid-ossp";<br /><br />
              
              <span className="text-slate-500">-- Tabla de Perfiles</span><br />
              <span className="text-blue-400">create table</span> public.profiles (<br />
              &nbsp;&nbsp;id uuid references auth.users on delete cascade primary key,<br />
              &nbsp;&nbsp;email text unique not null,<br />
              &nbsp;&nbsp;full_name text,<br />
              &nbsp;&nbsp;role text not null check (role in ('admin', 'owner', 'backer')) default 'backer'<br />
              );<br /><br />

              <span className="text-slate-500">-- Tabla de Proyectos</span><br />
              <span className="text-blue-400">create table</span> public.projects (<br />
              &nbsp;&nbsp;id text primary key,<br />
              &nbsp;&nbsp;owner_id uuid references public.profiles(id) on delete cascade not null,<br />
              &nbsp;&nbsp;name text not null,<br />
              &nbsp;&nbsp;description text,<br />
              &nbsp;&nbsp;category text not null check (category in ('construction', 'party', 'event', 'other'))<br />
              );<br /><br />

              <span className="text-slate-500">-- Tabla de Componentes / Requerimientos</span><br />
              <span className="text-blue-400">create table</span> public.components (<br />
              &nbsp;&nbsp;id uuid default gen_random_uuid() primary key,<br />
              &nbsp;&nbsp;project_id text references public.projects(id) on delete cascade not null,<br />
              &nbsp;&nbsp;name text not null,<br />
              &nbsp;&nbsp;unit_price numeric not null check (unit_price &gt;= 0),<br />
              &nbsp;&nbsp;quantity integer not null check (quantity &gt; 0),<br />
              &nbsp;&nbsp;remaining_quantity numeric not null,<br />
              &nbsp;&nbsp;funded_amount numeric not null default 0,<br />
              &nbsp;&nbsp;allow_partial boolean not null default false<br />
              );<br /><br />

              <span className="text-slate-500">-- Tabla de Contribuciones / Aportes</span><br />
              <span className="text-blue-400">create table</span> public.contributions (<br />
              &nbsp;&nbsp;id uuid default gen_random_uuid() primary key,<br />
              &nbsp;&nbsp;project_id text references public.projects(id) on delete cascade not null,<br />
              &nbsp;&nbsp;component_id uuid references public.components(id) on delete cascade not null,<br />
              &nbsp;&nbsp;backer_id uuid references public.profiles(id) on delete set null,<br />
              &nbsp;&nbsp;backer_email text not null,<br />
              &nbsp;&nbsp;backer_name text not null,<br />
              &nbsp;&nbsp;amount numeric not null check (amount &gt; 0),<br />
              &nbsp;&nbsp;quantity_bought numeric not null,<br />
              &nbsp;&nbsp;coupon_code text unique not null,<br />
              &nbsp;&nbsp;company_alias text not null<br />
              );
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
