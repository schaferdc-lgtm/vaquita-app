import React, { useState, useEffect } from 'react';
import { 
  Project, ProjectComponent, Contribution, UserProfile, 
  SupabaseConfig, ProjectCategory, UserAction, AdminEmail 
} from './types';
import { 
  INITIAL_USERS, INITIAL_PROJECTS, INITIAL_COMPONENTS 
} from './data';
import { supabase, isSupabaseConfigured, updateSupabaseClient } from './lib/supabase';
import ProjectCard from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import CouponModal from './components/CouponModal';
import SupabaseConfigPanel from './components/SupabaseConfigPanel';
import MyContributionsView from './components/MyContributionsView';
import ActivityLogView from './components/ActivityLogView';
import LegalViews from './components/LegalViews';
import { 
  Plus, Search, Database, LogIn, LogOut, ShieldAlert,
  User, Sparkles, Filter, AlertCircle, LayoutDashboard, Settings, Ticket, Hammer, GlassWater, Trash2,
  Check, X
} from 'lucide-react';

// Real-time local storage keys
const LS_PROJECTS = 'collaborative_crowdfund_projects';
const LS_COMPONENTS = 'collaborative_crowdfund_components';
const LS_CONTRIBUTIONS = 'collaborative_crowdfund_contributions';
const LS_USERS = 'collaborative_crowdfund_users';
const LS_ACTIVE_USER = 'collaborative_crowdfund_active_user';
const LS_CONFIG = 'collaborative_crowdfund_supabase_config';
const LS_USER_ACTIONS = 'collaborative_crowdfund_user_actions';
const LS_ADMIN_EMAILS = 'collaborative_crowdfund_admin_emails';

export default function App() {
  // --- DATABASE STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  
  // --- ADMIN PARAMETERS ---
  const [adminFeeMin, setAdminFeeMin] = useState<number>(50000);
  const [adminFeeMax, setAdminFeeMax] = useState<number>(1000000);
  const [adminFeePercent, setAdminFeePercent] = useState<number>(1);
  const [adminMinValidityDays, setAdminMinValidityDays] = useState<number>(30);
  
  // --- AUTH STATE ---
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [pendingRegistrationUser, setPendingRegistrationUser] = useState<{ id: string; email: string; full_name: string } | null>(null);

  // --- SUPABASE STATE ---
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    anonKey: '',
    isConnected: false,
  });
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // --- UI NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contributions' | 'admin' | 'settings'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLegalTab, setActiveLegalTab] = useState<'terms' | 'privacy' | 'refunds' | 'consumer' | 'faq' | null>(null);
  
  // --- FILTER & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');

  // --- ADMIN APPROVAL BOARD FILTER & SORT STATE ---
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [adminSortColumn, setAdminSortColumn] = useState<'id' | 'owner' | 'title' | 'startDate'>('id');
  const [adminSortDirection, setAdminSortDirection] = useState<'asc' | 'desc'>('asc');

  // --- MODALS & NOTIFICATIONS ---
  const [activeCoupon, setActiveCoupon] = useState<Contribution | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // --- LOGIN & REGISTRATION STATE ---
  const [loginGmailInput, setLoginGmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginHelp, setShowLoginHelp] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<'owner' | 'backer'>('backer');
  const [regError, setRegError] = useState('');

  useEffect(() => {
    if (pendingRegistrationUser) {
      setRegFullName(pendingRegistrationUser.full_name || '');
      setRegRole('backer');
      setRegError('');
    }
  }, [pendingRegistrationUser]);

  // --- PROJECT CREATION FORM STATE ---
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<ProjectCategory>('construction');
  const [newProjectComponentsInput, setNewProjectComponentsInput] = useState<string>(
    '100 Bolsones de Arena, Precio: 50000\n20 Bolsa de Cemento, Precio: 30000\n20 Bolsa de Cal, Precio: 40000\n3500 Ladrillos, Precio: 150'
  );
  const [newProjectComponentsGrid, setNewProjectComponentsGrid] = useState<{ name: string; quantity: number; price: number; thank_you_threshold_percent: number }[]>([
    { name: 'Bolsones de Arena', quantity: 100, price: 50000, thank_you_threshold_percent: 50 },
    { name: 'Bolsa de Cemento', quantity: 20, price: 30000, thank_you_threshold_percent: 50 },
    { name: 'Bolsa de Cal', quantity: 20, price: 40000, thank_you_threshold_percent: 50 },
    { name: 'Ladrillos', quantity: 3500, price: 150, thank_you_threshold_percent: 50 }
  ]);
  const [createProjectError, setCreateProjectError] = useState('');
  const [newProjectAvatarUrl, setNewProjectAvatarUrl] = useState('');
  const [newProjectBannerUrl, setNewProjectBannerUrl] = useState('');
  const [newProjectAlias, setNewProjectAlias] = useState('');
  const [newProjectCbu, setNewProjectCbu] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [newProjectStartDate, setNewProjectStartDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [newProjectEndDate, setNewProjectEndDate] = useState(() => {
    const monthsStr = localStorage.getItem('vaquita_admin_max_validity_months');
    const months = monthsStr ? Number(monthsStr) : 12;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-CA');
  });

  // --- NEW V2 STATES ---
  const [adminMaxValidityMonths, setAdminMaxValidityMonths] = useState<number>(12);
  const [specialThankYou, setSpecialThankYou] = useState<{
    backerName: string;
    amount: number;
    componentName: string;
    projectName: string;
    percent: number;
  } | null>(null);

  const [newProjectDocumentUrl, setNewProjectDocumentUrl] = useState('');
  const [newProjectDocumentName, setNewProjectDocumentName] = useState('');
  const [newProjectPhotoReel, setNewProjectPhotoReel] = useState<string[]>([]);

  // --- PROJECT EDITING FORM STATE ---
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectCategory, setEditProjectCategory] = useState<ProjectCategory>('construction');
  const [editProjectComponentsGrid, setEditProjectComponentsGrid] = useState<{ id?: string; name: string; quantity: number; price: number; thank_you_threshold_percent: number }[]>([]);
  const [editProjectError, setEditProjectError] = useState('');
  const [editProjectAvatarUrl, setEditProjectAvatarUrl] = useState('');
  const [editProjectBannerUrl, setEditProjectBannerUrl] = useState('');
  const [editProjectAlias, setEditProjectAlias] = useState('');
  const [editProjectCbu, setEditProjectCbu] = useState('');
  const [editProjectStartDate, setEditProjectStartDate] = useState('2026-06-01');
  const [editProjectEndDate, setEditProjectEndDate] = useState('2026-12-31');
  const [editProjectDocumentUrl, setEditProjectDocumentUrl] = useState('');
  const [editProjectDocumentName, setEditProjectDocumentName] = useState('');
  const [editProjectPhotoReel, setEditProjectPhotoReel] = useState<string[]>([]);

  // 1. Initial Load & LocalStorage Hydration
  useEffect(() => {
    // Hydrate users
    const localUsers = localStorage.getItem(LS_USERS);
    let loadedUsers: UserProfile[] = [];
    if (localUsers) {
      try {
        loadedUsers = JSON.parse(localUsers);
        // Migrate legacy "Diego" name to "Daniel" if found
        let migrated = false;
        loadedUsers = loadedUsers.map(u => {
          if (u.email === 'schaferdc@gmail.com' && u.full_name.includes('Diego')) {
            migrated = true;
            return { ...u, full_name: u.full_name.replace('Diego', 'Daniel') };
          }
          return u;
        });
        if (migrated) {
          localStorage.setItem(LS_USERS, JSON.stringify(loadedUsers));
        }
      } catch (e) {
        loadedUsers = INITIAL_USERS;
      }
      setUsers(loadedUsers);
    } else {
      setUsers(INITIAL_USERS);
      localStorage.setItem(LS_USERS, JSON.stringify(INITIAL_USERS));
    }

    // Hydrate active user
    const localActiveUser = localStorage.getItem(LS_ACTIVE_USER);
    if (localActiveUser) {
      try {
        let active = JSON.parse(localActiveUser);
        if (active && active.email === 'schaferdc@gmail.com' && active.full_name.includes('Diego')) {
          active.full_name = active.full_name.replace('Diego', 'Daniel');
          localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(active));
        }
        setActiveUser(active);
      } catch (e) {
        setActiveUser(null);
      }
    } else {
      // No login default, force user login first
      setActiveUser(null);
    }

    // Migration: Clear old mock/test projects once to "clean the screen"
    const testCleared = localStorage.getItem('vaquita_test_cleared_v3');
    if (!testCleared) {
      localStorage.removeItem(LS_PROJECTS);
      localStorage.removeItem(LS_COMPONENTS);
      localStorage.removeItem(LS_CONTRIBUTIONS);
      localStorage.setItem('vaquita_test_cleared_v3', 'true');
    }

    // Hydrate projects
    const localProjects = localStorage.getItem(LS_PROJECTS);
    let loadedProjects: Project[] = [];
    if (localProjects) {
      try {
        loadedProjects = JSON.parse(localProjects);
        let migrated = false;
        loadedProjects = loadedProjects.map((p) => {
          let updated = { ...p };
          if (!updated.start_date) {
            updated.start_date = '2026-06-01';
            migrated = true;
          }
          if (!updated.end_date) {
            updated.end_date = '2026-12-31';
            migrated = true;
          }
          if (updated.is_deleted === undefined) {
            updated.is_deleted = false;
            migrated = true;
          }
          if (updated.is_approved === undefined) {
            updated.is_approved = true;
            migrated = true;
          }
          if (!updated.banner_url) {
            const initialMatch = INITIAL_PROJECTS.find(ip => ip.id === updated.id);
            if (initialMatch && initialMatch.banner_url) {
              updated.banner_url = initialMatch.banner_url;
              migrated = true;
            }
          }
          if (!updated.avatar_url) {
            const initialMatch = INITIAL_PROJECTS.find(ip => ip.id === updated.id);
            if (initialMatch && initialMatch.avatar_url) {
              updated.avatar_url = initialMatch.avatar_url;
              migrated = true;
            }
          }
          return updated;
        });
        if (migrated) {
          localStorage.setItem(LS_PROJECTS, JSON.stringify(loadedProjects));
        }
      } catch (e) {
        loadedProjects = INITIAL_PROJECTS;
      }
      setProjects(loadedProjects);
    } else {
      setProjects(INITIAL_PROJECTS);
      localStorage.setItem(LS_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
    }

    // Hydrate components
    const localComponents = localStorage.getItem(LS_COMPONENTS);
    if (localComponents) {
      setComponents(JSON.parse(localComponents));
    } else {
      setComponents(INITIAL_COMPONENTS);
      localStorage.setItem(LS_COMPONENTS, JSON.stringify(INITIAL_COMPONENTS));
    }

    // Hydrate contributions
    const localContributions = localStorage.getItem(LS_CONTRIBUTIONS);
    let loadedContributions: Contribution[] = [];
    if (localContributions) {
      loadedContributions = JSON.parse(localContributions);
    } else {
      localStorage.setItem(LS_CONTRIBUTIONS, JSON.stringify([]));
    }

    // Hydrate Supabase config
    const localConfig = localStorage.getItem(LS_CONFIG);
    if (localConfig) {
      setSupabaseConfig(JSON.parse(localConfig));
    }

    // Hydrate Admin Parameters
    const localFeeMin = localStorage.getItem('vaquita_admin_fee_min');
    if (localFeeMin) setAdminFeeMin(Number(localFeeMin));
    const localFeeMax = localStorage.getItem('vaquita_admin_fee_max');
    if (localFeeMax) setAdminFeeMax(Number(localFeeMax));
    const localFeePercent = localStorage.getItem('vaquita_admin_fee_percent');
    if (localFeePercent !== null) setAdminFeePercent(Number(localFeePercent));
    const localMinVal = localStorage.getItem('vaquita_admin_min_validity_days');
    if (localMinVal) setAdminMinValidityDays(Number(localMinVal));
    const localMaxMonths = localStorage.getItem('vaquita_admin_max_validity_months');
    if (localMaxMonths) setAdminMaxValidityMonths(Number(localMaxMonths));

    // Hydrate User Actions
    const localUserActions = localStorage.getItem(LS_USER_ACTIONS);
    if (localUserActions) {
      setUserActions(JSON.parse(localUserActions));
    } else {
      setUserActions([]);
    }

    // Hydrate Admin Emails
    const localAdminEmails = localStorage.getItem(LS_ADMIN_EMAILS);
    if (localAdminEmails) {
      setAdminEmails(JSON.parse(localAdminEmails));
    } else {
      setAdminEmails([]);
    }

    // Process auto-expiry of pending contributions older than 24 hours on app load
    const now = new Date();
    let hasChanges = false;
    
    const rawProjects = localProjects ? JSON.parse(localProjects) : INITIAL_PROJECTS;
    const rawComponents = localComponents ? JSON.parse(localComponents) : INITIAL_COMPONENTS;
    
    const processedContributions = loadedContributions.map((contrib: Contribution) => {
      const updatedContrib = { ...contrib };
      if (!updatedContrib.status) {
        updatedContrib.status = 'pending';
      }
      
      if (updatedContrib.status === 'pending') {
        const createdDate = new Date(updatedContrib.created_at);
        const diffMs = now.getTime() - createdDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours >= 24) {
          updatedContrib.status = 'expired';
          hasChanges = true;
          
          // Revert component funding
          const compIndex = rawComponents.findIndex((c: ProjectComponent) => c.id === updatedContrib.component_id);
          if (compIndex !== -1) {
            const comp = rawComponents[compIndex];
            comp.remaining_quantity = Number((comp.remaining_quantity + updatedContrib.quantity_bought).toFixed(6));
            if (comp.remaining_quantity > comp.quantity) {
              comp.remaining_quantity = comp.quantity;
            }
            comp.funded_amount = Math.max(0, Number((comp.funded_amount - updatedContrib.amount).toFixed(2)));
          }
        }
      }
      return updatedContrib;
    });

    if (hasChanges) {
      setContributions(processedContributions);
      setComponents(rawComponents);
      localStorage.setItem(LS_COMPONENTS, JSON.stringify(rawComponents));
      localStorage.setItem(LS_CONTRIBUTIONS, JSON.stringify(processedContributions));
    } else {
      setContributions(processedContributions);
    }
  }, []);

  // 2. Función unificada para procesar el inicio de sesión
  const handleProcessLogin = (email: string, full_name: string, id: string) => {
    if (!email) return;

    const emailLower = email.toLowerCase();
    
    // Obtener la última lista de usuarios de localStorage para evitar closures desactualizados
    const localUsers = localStorage.getItem(LS_USERS);
    let currentUsers: UserProfile[] = [];
    try {
      currentUsers = localUsers ? JSON.parse(localUsers) : INITIAL_USERS;
    } catch (e) {
      currentUsers = INITIAL_USERS;
    }

    const existingUser = currentUsers.find(u => u.email.toLowerCase() === emailLower);

    if (existingUser) {
      setActiveUser(existingUser);
      localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(existingUser));
      setPendingRegistrationUser(null);
      showAlert('success', `Sesión iniciada como ${existingUser.full_name} (${existingUser.role === 'admin' ? 'Administrador' : existingUser.role === 'owner' ? 'Creador' : 'Aportante'})`);
      logUserAction(existingUser.email, 'INICIO_SESION_GMAIL', `Inició sesión con Gmail: ${existingUser.full_name}`);
    } else {
      if (emailLower === 'schaferdc@gmail.com') {
        const adminProfile: UserProfile = {
          id: id || 'admin-id',
          email: emailLower,
          full_name: 'Daniel Schafer',
          role: 'admin',
        };
        setActiveUser(adminProfile);
        localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(adminProfile));
        setPendingRegistrationUser(null);
        
        const updated = [...currentUsers, adminProfile];
        setUsers(updated);
        localStorage.setItem(LS_USERS, JSON.stringify(updated));

        showAlert('success', 'Sesión de Administrador iniciada de forma directa: Daniel Schafer');
        logUserAction(adminProfile.email, 'INICIO_SESION_ADMIN', 'Inició sesión directamente como Administrador');
      } else {
        setPendingRegistrationUser({ id: id || `user-${Math.random().toString(36).substr(2, 9)}`, email: emailLower, full_name });
      }
    }
  };

  // Función para cargar proyectos, requerimientos y aportes reales de Supabase
  const fetchRealDataFromSupabase = async () => {
    if (!supabase || !supabaseConfig.isConnected) return;
    try {
      // 1. Cargar proyectos reales
      const { data: dbProjects, error: pError } = await supabase
        .from('projects')
        .select('*');

      if (pError) throw pError;

      // 2. Cargar requerimientos reales
      const { data: dbComponents, error: compError } = await supabase
        .from('components')
        .select('*');

      if (compError) throw compError;

      // 3. Cargar aportes reales
      const { data: dbContributions, error: contribError } = await supabase
        .from('contributions')
        .select('*');

      if (contribError) throw contribError;

      // Mapear estructuras de BBDD a interfaces de TypeScript de React
      const mappedProjects: Project[] = (dbProjects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        category: p.category,
        owner_id: p.owner_id,
        created_at: p.created_at,
        avatar_url: p.avatar_url,
        banner_url: p.banner_url,
        payment_alias: p.payment_alias,
        payment_cbu: p.payment_cbu,
        start_date: p.start_date,
        end_date: p.end_date,
        is_deleted: p.is_deleted,
        is_approved: p.is_approved,
        tk_payment_method: p.tk_payment_method,
        tk_mp_preference_id: p.tk_mp_preference_id,
        tk_mp_payment_id: p.tk_mp_payment_id,
        tk_mp_payment_status: p.tk_mp_payment_status,
        tk_payment_ticket: p.tk_payment_ticket,
        max_duration_months: p.max_duration_months,
        document_url: p.document_url,
        document_name: p.document_name,
        photo_reel: p.photo_reel || [],
      }));

      const mappedComponents: ProjectComponent[] = (dbComponents || []).map((c: any) => ({
        id: c.id,
        project_id: c.project_id,
        name: c.name,
        unit_price: Number(c.unit_price),
        quantity: Number(c.quantity),
        remaining_quantity: Number(c.remaining_quantity),
        funded_amount: Number(c.funded_amount),
        allow_partial: c.allow_partial,
        total_price: Number(c.quantity) * Number(c.unit_price),
        thank_you_threshold_percent: c.thank_you_threshold_percent || 50,
      }));

      const mappedContributions: Contribution[] = (dbContributions || []).map((con: any) => ({
        id: con.id,
        project_id: con.project_id,
        component_id: con.component_id,
        backer_id: con.backer_id,
        backer_email: con.backer_email,
        backer_name: con.backer_name,
        amount: Number(con.amount),
        quantity_bought: Number(con.quantity_bought),
        coupon_code: con.coupon_code,
        company_alias: con.company_alias,
        created_at: con.created_at,
        status: con.status,
        payment_ticket: con.payment_ticket,
        payment_bank: con.payment_bank,
        validated_at: con.validated_at,
        payment_method: con.payment_method,
        mp_preference_id: con.mp_preference_id,
        mp_payment_id: con.mp_payment_id,
        mp_payment_status: con.mp_payment_status,
      }));

      setProjects(mappedProjects);
      setComponents(mappedComponents);
      setContributions(mappedContributions);
      setSupabaseError(null);

      // Guardar a localStorage
      localStorage.setItem(LS_PROJECTS, JSON.stringify(mappedProjects));
      localStorage.setItem(LS_COMPONENTS, JSON.stringify(mappedComponents));
      localStorage.setItem(LS_CONTRIBUTIONS, JSON.stringify(mappedContributions));
    } catch (err: any) {
      console.error('Error al sincronizar datos reales desde Supabase:', err.message || err);
      setSupabaseError(err.message || String(err));
    }
  };

  // 3. Escuchar cambios de Auth y cargar datos de Supabase
  useEffect(() => {
    if (!supabase) return;

    if (supabaseConfig.isConnected) {
      fetchRealDataFromSupabase();
    }

    // Verificar sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        const user = session.user;
        const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario Google';
        handleProcessLogin(user.email || '', name, user.id);
      }
    });

    // Cargar perfiles de usuario registrados en Supabase para sincronizar
    supabase
      .from('profiles')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) {
          setUsers((prev) => {
            const merged = [...prev];
            data.forEach((dbProfile: any) => {
              const idx = merged.findIndex(u => u.email.toLowerCase() === dbProfile.email.toLowerCase());
              const mappedProfile: UserProfile = {
                id: dbProfile.id,
                email: dbProfile.email,
                full_name: dbProfile.full_name || '',
                role: dbProfile.role as 'admin' | 'owner' | 'backer',
              };
              if (idx !== -1) {
                merged[idx] = {
                  ...merged[idx],
                  ...mappedProfile,
                  full_name: mappedProfile.full_name || merged[idx].full_name,
                };
              } else {
                merged.push(mappedProfile);
              }
            });
            localStorage.setItem(LS_USERS, JSON.stringify(merged));
            return merged;
          });
        } else if (error) {
          console.error('Error fetching Supabase profiles:', error);
        }
      });

    // Escuchar cambios de estado de autenticación (Login / Logout / Token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && session.user) {
          const user = session.user;
          const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario Google';
          handleProcessLogin(user.email || '', name, user.id);
        } else if (event === 'SIGNED_OUT') {
          setActiveUser(null);
          localStorage.removeItem(LS_ACTIVE_USER);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseConfig.isConnected]);

  // Función para iniciar sesión real con Google en Supabase
  const handleRealGoogleLogin = async () => {
    if (!supabase) {
      showAlert('error', 'Supabase no está configurado o conectado. Por favor, configúrelo en la pestaña de Conectar Supabase.');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      showAlert('error', `Error al iniciar sesión con Google: ${e.message || e}`);
    }
  };

  // Sync state modifications to local storage and Supabase if connected
  const syncToLocalStorage = (
    updatedProjects: Project[],
    updatedComponents: ProjectComponent[],
    updatedContributions: Contribution[]
  ) => {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(updatedProjects));
    localStorage.setItem(LS_COMPONENTS, JSON.stringify(updatedComponents));
    localStorage.setItem(LS_CONTRIBUTIONS, JSON.stringify(updatedContributions));

    if (supabase && supabaseConfig.isConnected) {
      // 1. Upsert projects
      if (updatedProjects.length > 0) {
        supabase
          .from('projects')
          .upsert(updatedProjects)
          .then(({ error }) => {
            if (error) console.error('Error upserting projects to Supabase:', error);
          });
      }

      // 2. Upsert components (exclude total_price generated column)
      if (updatedComponents.length > 0) {
        const componentsToUpsert = updatedComponents.map(({ total_price, ...rest }) => rest);
        supabase
          .from('components')
          .upsert(componentsToUpsert)
          .then(({ error }) => {
            if (error) console.error('Error upserting components to Supabase:', error);
          });
      }

      // 3. Upsert contributions
      if (updatedContributions.length > 0) {
        supabase
          .from('contributions')
          .upsert(updatedContributions)
          .then(({ error }) => {
            if (error) console.error('Error upserting contributions to Supabase:', error);
          });
      }
    }
  };

  // Log user actions & prune logs over 500 for non-admins
  const logUserAction = (email: string, actionType: string, details: string) => {
    const newAction: UserAction = {
      id: `act-${Math.random().toString(36).substring(2, 9)}`,
      user_email: email,
      action_type: actionType,
      details,
      created_at: new Date().toISOString(),
    };

    setUserActions((prev) => {
      let updated = [...prev, newAction];
      const lowerEmail = email.toLowerCase();
      // Keep only the last 500 actions per user (excluding 'schaferdc@gmail.com')
      if (lowerEmail !== 'schaferdc@gmail.com') {
        const userActionsOnly = updated.filter(a => a.user_email.toLowerCase() === lowerEmail);
        if (userActionsOnly.length > 500) {
          const oldestToPrune = userActionsOnly.slice(0, userActionsOnly.length - 500);
          const pruneIds = new Set(oldestToPrune.map(a => a.id));
          updated = updated.filter(a => !pruneIds.has(a.id));
        }
      }
      localStorage.setItem(LS_USER_ACTIONS, JSON.stringify(updated));
      return updated;
    });

    // Write to Supabase database if configured
    if (supabase) {
      supabase
        .from('user_actions')
        .insert({
          user_email: email,
          action_type: actionType,
          details: details
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error recording action in Supabase user_actions table:', error);
          }
        });
    }
  };

  const handleClearAllLogs = () => {
    setUserActions([]);
    localStorage.removeItem(LS_USER_ACTIONS);
    showAlert('success', 'Historial de auditoría local vaciado con éxito.');
  };

  // Switch Google login simulation profile
  const handleSwitchUser = (user: UserProfile) => {
    setActiveUser(user);
    localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(user));
    showAlert('success', `Sesión iniciada con Google como: ${user.full_name}`);
    logUserAction(user.email, 'CAMBIO_USUARIO', `Inició sesión con Google como ${user.full_name} (Rol: ${user.role})`);
  };

  const handleAddCustomUser = (email: string, name: string, role: 'admin' | 'owner' | 'backer') => {
    const isExist = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (isExist) {
      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase())!;
      handleSwitchUser(existing);
      return;
    }

    const newUser: UserProfile = {
      id: `user-${Math.random().toString(36).substring(2, 9)}`,
      email,
      full_name: name,
      role: email.toLowerCase() === 'schaferdc@gmail.com' ? 'admin' : role, // Enforce schaferdc as Admin!
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem(LS_USERS, JSON.stringify(updatedUsers));
    
    // We log both the creation/login of the new user
    logUserAction(email, 'INICIO_SESION', `Registró e inició sesión nueva con Google como ${name} (Rol: ${newUser.role})`);
    
    setActiveUser(newUser);
    localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(newUser));
    showAlert('success', `Sesión iniciada con Google como: ${newUser.full_name}`);
  };

  const handleLogout = async () => {
    if (activeUser) {
      logUserAction(activeUser.email, 'CERRAR_SESION', `Cerró la sesión de usuario`);
    }
    
    if (supabase && supabaseConfig.isConnected) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error signing out from Supabase Auth:', e);
      }
    }

    setActiveUser(null);
    localStorage.removeItem(LS_ACTIVE_USER);
    showAlert('success', 'Sesión cerrada con éxito.');
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // Supabase Configuration Handler
  const handleSaveSupabaseConfig = async (url: string, key: string) => {
    updateSupabaseClient(url, key);
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: key.trim(),
      isConnected: url.trim().length > 0 && key.trim().length > 0,
    };
    setSupabaseConfig(newConfig);
    localStorage.setItem(LS_CONFIG, JSON.stringify(newConfig));
    setSupabaseError(null);

    if (newConfig.isConnected) {
      showAlert('success', 'Configuración guardada. Verificando conexión...');
      if (supabase) {
        try {
          const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
          if (error) throw error;
          showAlert('success', '¡Conectado exitosamente al cliente de Supabase!');
          fetchRealDataFromSupabase();
        } catch (e: any) {
          const errMsg = e.message || String(e);
          setSupabaseError(errMsg);
          showAlert('error', `Error de conexión: ${errMsg}`);
        }
      }
    } else {
      showAlert('success', 'Desconectado de Supabase. Corriendo en persistencia local.');
    }
  };

  const handleResetSupabaseConfig = () => {
    updateSupabaseClient('', '');
    const defaultCfg = { url: '', anonKey: '', isConnected: false };
    setSupabaseConfig(defaultCfg);
    setSupabaseError(null);
    localStorage.removeItem(LS_CONFIG);
    showAlert('success', 'Configuración de Supabase reestablecida.');
  };

  // Add Contribution & Update Component remaining Stock (Business Logic Callback)
  const handleAddContribution = (newContrib: Contribution, updatedComp: ProjectComponent) => {
    // Append Contribution
    const updatedContributions = [...contributions, newContrib];
    setContributions(updatedContributions);

    // Update Components Array
    const updatedComponents = components.map((c) => c.id === updatedComp.id ? updatedComp : c);
    setComponents(updatedComponents);

    // Persist
    syncToLocalStorage(projects, updatedComponents, updatedContributions);
    
    // Log user action
    logUserAction(
      newContrib.backer_email,
      'RESERVA_APORTE',
      `Reservó ${newContrib.quantity_bought % 1 === 0 ? newContrib.quantity_bought : newContrib.quantity_bought.toFixed(3)} u. de "${updatedComp.name}" por un valor de $${newContrib.amount.toLocaleString('es-AR')} en el proyecto ${newContrib.project_id}`
    );

    // Open payment coupon
    setActiveCoupon(newContrib);
    
    // Check if the contribution amount represents a significant percentage of the total item cost
    const thresholdPercent = updatedComp.thank_you_threshold_percent ?? 50; // Default to 50%
    const totalItemCost = updatedComp.quantity * updatedComp.unit_price;
    const contributionPercent = totalItemCost > 0 ? (newContrib.amount / totalItemCost) * 100 : 0;
    
    if (contributionPercent >= thresholdPercent) {
      const proj = projects.find(p => p.id === newContrib.project_id);
      setSpecialThankYou({
        backerName: newContrib.backer_name,
        amount: newContrib.amount,
        componentName: updatedComp.name,
        projectName: proj ? proj.name : newContrib.project_id,
        percent: Math.round(contributionPercent),
      });
    } else {
      showAlert('success', `Aporte reservado. Por favor realiza la transferencia bancaria y carga tu comprobante desde la pestaña "Mis Aportes" para recibir la validación.`);
    }
  };

  const handleUploadPaymentTicket = (contribId: string, ticket: string, bank: string) => {
    if (!ticket.trim()) {
      showAlert('error', 'Por favor, ingrese el Nro de Operación o de Comprobante.');
      return;
    }
    if (!bank.trim()) {
      showAlert('error', 'Por favor, ingrese la entidad o banco emisor.');
      return;
    }
    const contrib = contributions.find(c => c.id === contribId);
    if (!contrib) return;

    const updated = contributions.map((c) => {
      if (c.id === contribId) {
        return {
          ...c,
          payment_ticket: ticket.trim(),
          payment_bank: bank.trim(),
          status: 'pending' as const
        };
      }
      return c;
    });
    setContributions(updated);
    syncToLocalStorage(projects, components, updated);

    // Log action
    logUserAction(
      contrib.backer_email,
      'CARGA_COMPROBANTE',
      `Cargó comprobante Nro ${ticket} (${bank}) para su aporte de $${contrib.amount.toLocaleString('es-AR')} en ${contrib.project_id}`
    );

    showAlert('success', '¡Comprobante cargado con éxito! El administrador validará tu transferencia en breve.');
  };

  const handleApproveContribution = (contribId: string) => {
    const contrib = contributions.find(c => c.id === contribId);
    if (!contrib) return;

    const updated = contributions.map((c) => {
      if (c.id === contribId) {
        return { ...c, status: 'approved' as const, validated_at: new Date().toISOString() };
      }
      return c;
    });
    setContributions(updated);
    syncToLocalStorage(projects, components, updated);

    // Log action
    if (activeUser) {
      logUserAction(
        activeUser.email,
        'APROBACION_APORTE',
        `Aprobó el aporte de $${contrib.amount.toLocaleString('es-AR')} de ${contrib.backer_name} (${contrib.backer_email})`
      );
    }

    showAlert('success', 'Aporte aprobado y verificado con éxito.');
  };

  const handleRejectContribution = (contribId: string) => {
    const contrib = contributions.find((c) => c.id === contribId);
    if (!contrib) return;

    const updatedContribs = contributions.map((c) => {
      if (c.id === contribId) {
        return { ...c, status: 'rejected' as const };
      }
      return c;
    });

    const updatedComps = components.map((comp) => {
      if (comp.id === contrib.component_id) {
        const newRemaining = Number((comp.remaining_quantity + contrib.quantity_bought).toFixed(6));
        return {
          ...comp,
          remaining_quantity: newRemaining > comp.quantity ? comp.quantity : newRemaining,
          funded_amount: Math.max(0, Number((comp.funded_amount - contrib.amount).toFixed(2))),
        };
      }
      return comp;
    });

    setContributions(updatedContribs);
    setComponents(updatedComps);
    syncToLocalStorage(projects, updatedComps, updatedContribs);

    // Log action
    if (activeUser) {
      logUserAction(
        activeUser.email,
        'RECHAZO_APORTE',
        `Rechazó el aporte de $${contrib.amount.toLocaleString('es-AR')} de ${contrib.backer_name} (${contrib.backer_email})`
      );
    }

    showAlert('error', 'Aporte rechazado. Los insumos y montos han sido devueltos al proyecto.');
  };

  // Owner/Admin: Add dynamic component
  const handleAddComponent = (newComp: ProjectComponent) => {
    const updatedComponents = [...components, newComp];
    setComponents(updatedComponents);
    syncToLocalStorage(projects, updatedComponents, contributions);

    // Log action
    if (activeUser) {
      logUserAction(
        activeUser.email,
        'CREACION_REQUERIMIENTO',
        `Agregó el requerimiento "${newComp.name}" (Cantidad: ${newComp.quantity}, Precio unitario: $${newComp.unit_price.toLocaleString('es-AR')}) al proyecto ${newComp.project_id}`
      );
    }

    showAlert('success', `Requerimiento "${newComp.name}" agregado con éxito.`);
  };

  // Owner/Admin: Delete component
  const handleDeleteComponent = (componentId: string) => {
    const comp = components.find((c) => c.id === componentId);
    const updatedComponents = components.filter((c) => c.id !== componentId);
    // filter out contributions for that component too
    const updatedContributions = contributions.filter((c) => c.component_id !== componentId);
    setComponents(updatedComponents);
    setContributions(updatedContributions);
    syncToLocalStorage(projects, updatedComponents, updatedContributions);

    // Log action
    if (activeUser && comp) {
      logUserAction(
        activeUser.email,
        'ELIMINACION_REQUERIMIENTO',
        `Eliminó el requerimiento "${comp.name}" del proyecto ${comp.project_id}`
      );
    }

    showAlert('success', 'Requerimiento eliminado.');
  };

  // File handlers for project avatars
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showAlert('error', 'La imagen no debe superar los 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProjectAvatarUrl(reader.result as string);
        showAlert('success', '¡Imagen de avatar cargada con éxito!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        showAlert('error', 'Por favor, suba un archivo de imagen válido.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showAlert('error', 'La imagen no debe superar los 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProjectAvatarUrl(reader.result as string);
        showAlert('success', '¡Imagen de avatar arrastrada y cargada con éxito!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Create project with list of components parsing
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateProjectError('');

    if (!newProjectId || !newProjectName || !newProjectDesc) {
      setCreateProjectError('Por favor complete todos los campos básicos.');
      return;
    }

    if (!newProjectAlias.trim() && !newProjectCbu.trim()) {
      setCreateProjectError('Por favor ingrese al menos un CBU o un Alias de pago para recibir los aportes.');
      return;
    }

    // Alphanumeric format check for project ID
    const sanitizedId = newProjectId.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!sanitizedId) {
      setCreateProjectError('El ID del proyecto debe contener letras, números o guiones.');
      return;
    }

    if (sanitizedId.length > 15) {
      setCreateProjectError('El ID del proyecto no puede superar los 15 caracteres.');
      return;
    }

    // Check unique ID
    if (projects.some(p => p.id === sanitizedId)) {
      setCreateProjectError(`El ID de proyecto "${sanitizedId}" ya existe. Ingrese uno único.`);
      return;
    }

    // Process components from the interactive grid
    const parsedComponents: ProjectComponent[] = [];

    for (let i = 0; i < newProjectComponentsGrid.length; i++) {
      const item = newProjectComponentsGrid[i];
      const name = item.name.trim();
      const qty = item.quantity;
      const price = item.price;

      if (!name) {
        setCreateProjectError(`Error en el ítem ${i + 1}: El nombre no puede estar vacío.`);
        return;
      }

      if (qty <= 0 || price <= 0) {
        setCreateProjectError(`Error en el ítem "${name}": La cantidad y el precio deben ser mayores a cero.`);
        return;
      }

      // Check fractional support rule: unit_price > 100000 and quantity < 3
      const allowPartial = price > 100000 && qty < 3;

      parsedComponents.push({
        id: `comp-${sanitizedId}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        project_id: sanitizedId,
        name,
        unit_price: price,
        quantity: qty,
        remaining_quantity: qty,
        funded_amount: 0,
        allow_partial: allowPartial,
        total_price: qty * price,
        thank_you_threshold_percent: item.thank_you_threshold_percent || 50
      });
    }

    if (parsedComponents.length === 0) {
      setCreateProjectError('Debe ingresar al menos un insumo o requerimiento en la grilla.');
      return;
    }

    if (!newProjectStartDate || !newProjectEndDate) {
      setCreateProjectError('Por favor ingrese las fechas de inicio y fin del proyecto.');
      return;
    }
    if (newProjectStartDate > newProjectEndDate) {
      setCreateProjectError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (newProjectStartDate < todayStr) {
      setCreateProjectError('La fecha de inicio no puede ser menor a la fecha actual.');
      return;
    }

    const start_dt = new Date(newProjectStartDate);
    const end_dt = new Date(newProjectEndDate);
    
    // Calculate difference in months for V2 requirement
    let diff_months = (end_dt.getFullYear() - start_dt.getFullYear()) * 12 + (end_dt.getMonth() - start_dt.getMonth());
    // Account for partial month days
    if (end_dt.getDate() < start_dt.getDate()) {
      diff_months--;
    }
    const final_diff_months = diff_months <= 0 ? 1 : diff_months;

    const diff_time = end_dt.getTime() - start_dt.getTime();
    const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days < adminMinValidityDays) {
      setCreateProjectError(`La duración de la vigencia del proyecto (${diff_days} días) no puede ser menor al mínimo establecido de ${adminMinValidityDays} días.`);
      return;
    }
    if (final_diff_months > adminMaxValidityMonths) {
      setCreateProjectError(`La duración del proyecto (${final_diff_months} meses) no puede ser mayor al límite máximo de vigencia configurado por el administrador (${adminMaxValidityMonths} meses).`);
      return;
    }

    // Build Project Object
    const newProject: Project = {
      id: sanitizedId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      category: newProjectCategory,
      owner_id: activeUser?.id || 'e482701b-c741-4e0d-b8d9-2f2dbf77c3a0',
      created_at: new Date().toISOString(),
      avatar_url: newProjectAvatarUrl || undefined,
      banner_url: newProjectBannerUrl || undefined,
      payment_alias: newProjectAlias.trim() || undefined,
      payment_cbu: newProjectCbu.trim() || undefined,
      start_date: newProjectStartDate,
      end_date: newProjectEndDate,
      is_deleted: false,
      is_approved: false,
      max_duration_months: adminMaxValidityMonths,
      document_url: newProjectDocumentUrl || undefined,
      document_name: newProjectDocumentName || undefined,
      photo_reel: newProjectPhotoReel.length > 0 ? newProjectPhotoReel : undefined,
    };

    const updatedProjects = [...projects, newProject];
    const updatedComponents = [...components, ...parsedComponents];

    setProjects(updatedProjects);
    setComponents(updatedComponents);
    syncToLocalStorage(updatedProjects, updatedComponents, contributions);

    // Log action
    if (activeUser) {
      logUserAction(
        activeUser.email,
        'CREACION_PROYECTO',
        `Creó el proyecto "${newProject.name}" con ID: ${sanitizedId} (Categoría: ${newProject.category})`
      );
    }

    // Reset Form
    setNewProjectId('');
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectAvatarUrl('');
    setNewProjectBannerUrl('');
    setNewProjectAlias('');
    setNewProjectCbu('');
    setNewProjectComponentsGrid([
      { name: 'Bolsones de Arena', quantity: 100, price: 50000 },
      { name: 'Bolsa de Cemento', quantity: 20, price: 30000 },
      { name: 'Bolsa de Cal', quantity: 20, price: 40000 },
      { name: 'Ladrillos', quantity: 3500, price: 150 }
    ]);
    const todayReset = new Date();
    const todayStrReset = todayReset.toLocaleDateString('en-CA');
    const endReset = new Date(todayReset);
    endReset.setMonth(todayReset.getMonth() + adminMaxValidityMonths);
    const endStrReset = endReset.toLocaleDateString('en-CA');
    setNewProjectStartDate(todayStrReset);
    setNewProjectEndDate(endStrReset);
    setShowCreateProjectForm(false);
    showAlert('success', `Proyecto "${newProject.name}" creado con ID: ${sanitizedId}`);
  };

  // Open Edit Project modal/form with prepopulated values
  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDesc(project.description);
    setEditProjectCategory(project.category);
    setEditProjectAvatarUrl(project.avatar_url || '');
    setEditProjectBannerUrl(project.banner_url || '');
    setEditProjectAlias(project.payment_alias || '');
    setEditProjectCbu(project.payment_cbu || '');
    setEditProjectStartDate(project.start_date);
    setEditProjectEndDate(project.end_date);
    setEditProjectDocumentUrl(project.document_url || '');
    setEditProjectDocumentName(project.document_name || '');
    setEditProjectPhotoReel(project.photo_reel || []);
    
    // Find components for this project
    const projectComps = components.filter((c) => c.project_id === project.id);
    setEditProjectComponentsGrid(
      projectComps.map((c) => ({
        id: c.id,
        name: c.name,
        quantity: c.quantity,
        price: c.unit_price,
        thank_you_threshold_percent: c.thank_you_threshold_percent || 50,
      }))
    );
    setEditProjectError('');
  };

  // Save modified project and its supplies/requirements grid
  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (!editProjectName.trim()) {
      setEditProjectError('El nombre del proyecto es obligatorio.');
      return;
    }
    if (!editProjectDesc.trim()) {
      setEditProjectError('La descripción del proyecto es obligatoria.');
      return;
    }
    if (!editProjectStartDate || !editProjectEndDate) {
      setEditProjectError('Por favor ingrese las fechas de inicio y fin del proyecto.');
      return;
    }
    if (editProjectStartDate > editProjectEndDate) {
      setEditProjectError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (editProjectStartDate !== editingProject.start_date && editProjectStartDate < todayStr) {
      setEditProjectError('La fecha de inicio no puede ser menor a la fecha actual.');
      return;
    }

    // Guardrail: Check campaign validity duration against administrative limits
    const start_dt = new Date(editProjectStartDate);
    const end_dt = new Date(editProjectEndDate);
    
    // Calculate difference in months for V2 requirement
    let diff_months = (end_dt.getFullYear() - start_dt.getFullYear()) * 12 + (end_dt.getMonth() - start_dt.getMonth());
    // Account for partial month days
    if (end_dt.getDate() < start_dt.getDate()) {
      diff_months--;
    }
    const final_diff_months = diff_months <= 0 ? 1 : diff_months;

    const diff_time = end_dt.getTime() - start_dt.getTime();
    const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days < adminMinValidityDays) {
      setEditProjectError(`La duración de la vigencia del proyecto (${diff_days} días) no puede ser menor al mínimo establecido de ${adminMinValidityDays} días.`);
      return;
    }
    if (final_diff_months > adminMaxValidityMonths) {
      setEditProjectError(`La duración del proyecto (${final_diff_months} meses) no puede ser mayor al límite máximo de vigencia configurado por el administrador (${adminMaxValidityMonths} meses).`);
      return;
    }

    // Process components grid
    const parsedComps: ProjectComponent[] = [];
    for (let i = 0; i < editProjectComponentsGrid.length; i++) {
      const item = editProjectComponentsGrid[i];
      const name = item.name.trim();
      const qty = item.quantity;
      const price = item.price;
      const threshold = item.thank_you_threshold_percent || 50;

      if (!name) {
        setEditProjectError(`Error en el ítem ${i + 1}: El nombre no puede estar vacío.`);
        return;
      }
      if (qty <= 0 || price <= 0) {
        setEditProjectError(`Error en el ítem "${name}": La cantidad y el precio deben ser mayores a cero.`);
        return;
      }

      const allowPartial = price > 100000 && qty < 3;

      // Check if it already exists or if it's new
      if (item.id) {
        const existingComp = components.find(c => c.id === item.id);
        if (existingComp) {
          const alreadyFundedUnits = Math.max(0, existingComp.quantity - existingComp.remaining_quantity);
          const remaining = Math.max(0, qty - alreadyFundedUnits);

          parsedComps.push({
            ...existingComp,
            name,
            unit_price: price,
            quantity: qty,
            remaining_quantity: remaining,
            allow_partial: allowPartial,
            total_price: qty * price,
            thank_you_threshold_percent: threshold,
          });
        } else {
          parsedComps.push({
            id: item.id,
            project_id: editingProject.id,
            name,
            unit_price: price,
            quantity: qty,
            remaining_quantity: qty,
            funded_amount: 0,
            allow_partial: allowPartial,
            total_price: qty * price,
            thank_you_threshold_percent: threshold,
          });
        }
      } else {
        parsedComps.push({
          id: `comp-${editingProject.id}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          project_id: editingProject.id,
          name,
          unit_price: price,
          quantity: qty,
          remaining_quantity: qty,
          funded_amount: 0,
          allow_partial: allowPartial,
          total_price: qty * price,
          thank_you_threshold_percent: threshold,
        });
      }
    }

    if (parsedComps.length === 0) {
      setEditProjectError('Debe ingresar al menos un insumo o requerimiento en la grilla.');
      return;
    }

    const updatedProject: Project = {
      ...editingProject,
      name: editProjectName.trim(),
      description: editProjectDesc.trim(),
      category: editProjectCategory,
      avatar_url: editProjectAvatarUrl || undefined,
      banner_url: editProjectBannerUrl || undefined,
      payment_alias: editProjectAlias.trim() || undefined,
      payment_cbu: editProjectCbu.trim() || undefined,
      start_date: editProjectStartDate,
      end_date: editProjectEndDate,
      document_url: editProjectDocumentUrl || undefined,
      document_name: editProjectDocumentName || undefined,
      photo_reel: editProjectPhotoReel.length > 0 ? editProjectPhotoReel : undefined,
    };

    const updatedProjects = projects.map(p => p.id === editingProject.id ? updatedProject : p);
    const otherProjectsComps = components.filter(c => c.project_id !== editingProject.id);
    const updatedComponents = [...otherProjectsComps, ...parsedComps];

    setProjects(updatedProjects);
    setComponents(updatedComponents);
    syncToLocalStorage(updatedProjects, updatedComponents, contributions);

    if (activeUser) {
      logUserAction(
        activeUser.email,
        'MODIFICACION_PROYECTO',
        `Modificó el proyecto "${updatedProject.name}" con ID: ${editingProject.id}`
      );
    }

    setEditingProject(null);
    showAlert('success', `Proyecto "${updatedProject.name}" modificado con éxito.`);
  };

  // Delete project entirely (Admin only)
  const handleDeleteProject = (projectId: string) => {
    if (activeUser?.role !== 'admin') {
      showAlert('error', 'Solo los administradores pueden eliminar proyectos.');
      return;
    }

    if (confirm(`¿Está seguro que desea eliminar por completo el proyecto "${projectId}" y todos sus insumos asociados?`)) {
      const updatedProjects = projects.filter((p) => p.id !== projectId);
      const updatedComponents = components.filter((c) => c.project_id !== projectId);
      const updatedContributions = contributions.filter((c) => c.project_id !== projectId);

      setProjects(updatedProjects);
      setComponents(updatedComponents);
      setContributions(updatedContributions);
      syncToLocalStorage(updatedProjects, updatedComponents, updatedContributions);
      
      // Log action
      if (activeUser) {
        logUserAction(
          activeUser.email,
          'ELIMINACION_PROYECTO',
          `Eliminó por completo el proyecto "${projectId}" y todos sus insumos asociados`
        );
      }

      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      showAlert('success', `Proyecto ${projectId} eliminado.`);
    }
  };

  // Update Project Dates (Owner or Admin)
  const handleUpdateProjectDates = (projectId: string, newStartDate: string, newEndDate: string) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, start_date: newStartDate, end_date: newEndDate };
      }
      return p;
    });
    setProjects(updated);
    syncToLocalStorage(updated, components, contributions);
    
    if (activeUser) {
      logUserAction(
        activeUser.email,
        'MODIFICACION_VIGENCIA',
        `Modificó la vigencia del proyecto ${projectId} (Inicio: ${newStartDate}, Fin: ${newEndDate})`
      );
    }
    showAlert('success', 'Las fechas de vigencia se han actualizado correctamente.');
  };

  // Toggle Project Approval (OK final de vigencia) - Admin or Auto MP
  const handleToggleProjectApproval = (projectId: string, approve: boolean, isAutoMpApproved?: boolean) => {
    if (!isAutoMpApproved && activeUser?.role !== 'admin') {
      showAlert('error', 'Solo los administradores pueden autorizar vigencia de proyectos.');
      return;
    }

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, is_approved: approve };
      }
      return p;
    });
    setProjects(updated);
    syncToLocalStorage(updated, components, contributions);

    if (activeUser || isAutoMpApproved) {
      const actorEmail = isAutoMpApproved ? 'sistema@mercadopago.com' : (activeUser?.email || 'admin');
      logUserAction(
        actorEmail,
        approve ? 'APROBACION_VIGENCIA_PROYECTO' : 'RECHAZO_VIGENCIA_PROYECTO',
        `${approve ? 'Aprobó' : 'Rechazó'} el OK final de vigencia del proyecto ${projectId} (${isAutoMpApproved ? 'Acreditación instantánea vía Mercado Pago' : 'Acción manual por Admin'})`
      );
    }
    showAlert('success', approve 
      ? (isAutoMpApproved 
          ? '¡Vigencia aprobada automáticamente por acreditación de pago de Mercado Pago!'
          : 'Vigencia aprobada exitosamente (OK Final de Crowdfunding).')
      : 'Se ha rechazado/denegado la vigencia del proyecto.'
    );
  };

  // Send simulated email notifications to Admin (schaferdc@gmail.com)
  const handleSendAdminEmail = (
    type: 'payment_intent' | 'payment_result',
    details: { projectId: string; amount: number; isSuccess?: boolean; paymentId?: string }
  ) => {
    const senderName = activeUser?.full_name || 'Project Owner';
    const senderEmail = activeUser?.email || 'owner@proyecto.com';
    const projectMatch = projects.find(p => p.id === details.projectId);
    const projectName = projectMatch ? projectMatch.name : details.projectId;

    let subject = '';
    let body = '';

    if (type === 'payment_intent') {
      subject = `⚠️ Intención de Pago de Comisión: "${projectName}"`;
      body = `El usuario <strong>${senderName}</strong> (${senderEmail}) está por realizar el pago de la comisión/servicio de crowdfunding para activar el proyecto <strong>"${projectName}"</strong> (ID: ${details.projectId}).<br/><br/>` +
             `<strong>Monto de Comisión a pagar:</strong> $${details.amount.toLocaleString('es-AR')}<br/>` +
             `<strong>Medio de Pago:</strong> Mercado Pago Checkout Pro<br/>` +
             `<strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-AR')}<br/><br/>` +
             `<em>Este es un aviso automático de intención de pago. El proyecto/evento quedará habilitado de manera automática una vez que la transacción de Mercado Pago sea exitosa.</em>`;
    } else {
      subject = `✅ Pago de Comisión Acreditado: "${projectName}"`;
      body = `¡Buenas noticias! Se ha acreditado exitosamente el pago de la comisión/servicio para el proyecto <strong>"${projectName}"</strong> (ID: ${details.projectId}).<br/><br/>` +
             `<strong>Monto de Comisión:</strong> $${details.amount.toLocaleString('es-AR')}<br/>` +
             `<strong>Medio de Pago:</strong> Mercado Pago Checkout Pro<br/>` +
             `<strong>ID de Operación MP:</strong> <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #009EE3;">${details.paymentId}</code><br/>` +
             `<strong>Resultado:</strong> Transacción Conciliada al instante<br/>` +
             `<strong>Fecha de Acreditación:</strong> ${new Date().toLocaleString('es-AR')}<br/><br/>` +
             `<strong>Habilitación del Proyecto:</strong> AUTOMÁTICA ✔ (El estado del proyecto se ha actualizado a <strong>VIGENTE</strong> de manera inmediata y ya se encuentra habilitado para recibir aportes en línea).`;
    }

    const newEmail: AdminEmail = {
      id: `mail-${Math.random().toString(36).substring(2, 9)}`,
      sender_name: senderName,
      sender_email: senderEmail,
      recipient_email: 'schaferdc@gmail.com',
      subject,
      body,
      received_at: new Date().toISOString(),
      is_read: false,
      type
    };

    setAdminEmails(prev => {
      const updated = [newEmail, ...prev]; // Put new emails at the beginning of the inbox
      localStorage.setItem(LS_ADMIN_EMAILS, JSON.stringify(updated));
      return updated;
    });

    logUserAction(
      senderEmail,
      type === 'payment_intent' ? 'ENVIO_MAIL_INTENCION_PAGO' : 'ENVIO_MAIL_RESULTADO_PAGO',
      `Se envió correo automático al administrador notificando: ${subject}`
    );

    showAlert('success', `📧 Notificación de correo enviada al Admin (${newEmail.recipient_email})`);
  };

  // Soft delete project (Owner or Admin)
  const handleSoftDeleteProject = (projectId: string) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, is_deleted: true };
      }
      return p;
    });
    setProjects(updated);
    syncToLocalStorage(updated, components, contributions);

    if (activeUser) {
      logUserAction(
        activeUser.email,
        'ELIMINACION_LOGICA_PROYECTO',
        `Eliminó lógicamente el proyecto ${projectId}`
      );
    }
    showAlert('success', 'El proyecto ha sido archivado (eliminado lógicamente).');
  };

  // Restore soft deleted project (Admin only)
  const handleRestoreProject = (projectId: string) => {
    if (activeUser?.role !== 'admin') {
      showAlert('error', 'Solo los administradores pueden restaurar proyectos.');
      return;
    }

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, is_deleted: false };
      }
      return p;
    });
    setProjects(updated);
    syncToLocalStorage(updated, components, contributions);

    if (activeUser) {
      logUserAction(
        activeUser.email,
        'RESTAURACION_PROYECTO',
        `Restauró el proyecto lógicamente eliminado ${projectId}`
      );
    }
    showAlert('success', 'El proyecto ha sido restaurado con éxito.');
  };

  // User revocation / Botón de Arrepentimiento
  const handleRevokeContribution = (contribId: string, reason: string) => {
    const contrib = contributions.find((c) => c.id === contribId);
    if (!contrib) return;

    // 1. Mark contribution as rejected (meaning canceled/revoked)
    const updatedContribs = contributions.map((c) => {
      if (c.id === contribId) {
        return { ...c, status: 'rejected' as const };
      }
      return c;
    });

    // 2. Revert the quantities/funded amount on the components
    const updatedComps = components.map((comp) => {
      if (comp.id === contrib.component_id) {
        const newRemaining = Number((comp.remaining_quantity + contrib.quantity_bought).toFixed(6));
        return {
          ...comp,
          remaining_quantity: newRemaining > comp.quantity ? comp.quantity : newRemaining,
          funded_amount: Math.max(0, Number((comp.funded_amount - contrib.amount).toFixed(2))),
        };
      }
      return comp;
    });

    setContributions(updatedContribs);
    setComponents(updatedComps);
    syncToLocalStorage(projects, updatedComps, updatedContribs);

    // 3. Log user action
    logUserAction(
      contrib.backer_email,
      'ARREPENTIMIENTO_APORTE',
      `Solicitó arrepentimiento/revocación de aporte de $${contrib.amount.toLocaleString('es-AR')} para ${contrib.component_id}. Motivo: ${reason}`
    );

    showAlert('success', 'Aporte revocado exitosamente por arrepentimiento del consumidor.');
  };

  // Aggregate stats
  const totalProjectsCount = projects.length;
  const globalRequiredFunding = components.reduce((sum, c) => sum + c.total_price, 0);
  const globalRemainingFunding = components.reduce((sum, c) => sum + (c.remaining_quantity * c.unit_price), 0);
  const globalFundedFunding = Math.max(0, globalRequiredFunding - globalRemainingFunding);
  const globalProgressPercentage = globalRequiredFunding > 0 ? Math.min(100, Math.round((globalFundedFunding / globalRequiredFunding) * 100)) : 0;

  // Filter projects by category & search
  const filteredProjects = projects.filter((p) => {
    // Hide deleted projects unless user is admin or the owner
    const isOwnerOfProject = activeUser?.id === p.owner_id;
    if (p.is_deleted && !isAdmin && !isOwnerOfProject) {
      return false;
    }

    const matchesSearch = p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Is Admin schaferdc check
  const isAdmin = activeUser?.email === 'schaferdc@gmail.com';

  // Calculate user contributions that are pending and lack a payment ticket
  const pendingTicketsCount = activeUser 
    ? contributions.filter(c => c.backer_email.toLowerCase() === activeUser.email.toLowerCase() && (!c.status || c.status === 'pending') && !c.payment_ticket).length
    : 0;

  // Calculate pending projects and validation tickets for Admin notification (red dot)
  const pendingProjectsCount = projects.filter(p => !p.is_approved).length;
  const pendingContributionsCount = contributions.filter(c => c.status === 'pending').length;
  const totalAdminPendingCount = pendingProjectsCount + pendingContributionsCount;

  // Si no hay sesión activa, mostramos la pantalla de login o de registro de perfil
  if (!activeUser) {
    if (pendingRegistrationUser) {
      // Formulario Completar Registro de Perfil
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 p-4">
          {alertMessage && (
            <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all animate-bounce ${
              alertMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <Sparkles className={`w-5 h-5 ${alertMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`} />
              <span className="text-xs font-bold">{alertMessage.text}</span>
            </div>
          )}

          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 space-y-6">
            {/* Header del Formulario */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <User className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Completar Registro de Perfil</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                ¡Hola! Vemos que es tu primera vez en VaquitaApp con el correo <strong className="font-semibold text-slate-700">{pendingRegistrationUser.email}</strong>.
              </p>
            </div>

            {regError && (
              <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!regFullName.trim()) {
                setRegError('Por favor, ingresa tu nombre completo.');
                return;
              }
              
              // Crear el perfil del usuario
              const newProfile: UserProfile = {
                id: pendingRegistrationUser.id,
                email: pendingRegistrationUser.email,
                full_name: regFullName.trim(),
                role: regRole,
              };

              // Guardar en la base de datos local
              setUsers(prev => {
                const updated = [...prev, newProfile];
                localStorage.setItem(LS_USERS, JSON.stringify(updated));
                return updated;
              });

              // Seteamos como usuario activo
              setActiveUser(newProfile);
              localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(newProfile));
              setPendingRegistrationUser(null);

              showAlert('success', '¡Perfil configurado con éxito! Bienvenido a VaquitaApp.');
              logUserAction(newProfile.email, 'REGISTRO_PERFIL_NUEVO', `Se registró con rol ${newProfile.role} y nombre ${newProfile.full_name}`);

              // Sincronizar perfil con la base de datos de Supabase si está disponible y es un ID real
              if (supabase) {
                const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newProfile.id);
                if (isRealUuid) {
                  supabase
                    .from('profiles')
                    .update({
                      full_name: newProfile.full_name,
                      role: newProfile.role
                    })
                    .eq('id', newProfile.id)
                    .then(({ error }) => {
                      if (error) {
                        console.error('Error updating profile in Supabase profiles table:', error);
                      }
                    });
                }
              }
            }} className="space-y-5">
              
              {/* Campo Nombre Completo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition"
                />
              </div>

              {/* Selección de Rol / Perfil */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  ¿Cuál es tu Rol en la Plataforma?
                </label>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* Creador de Proyectos (owner) */}
                  <button
                    type="button"
                    onClick={() => setRegRole('owner')}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer hover:bg-slate-50/50 ${
                      regRole === 'owner'
                        ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      regRole === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Hammer className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 leading-none">Creador de Proyectos</p>
                      <p className="text-[10px] text-slate-500 leading-normal mt-1">
                        Quiero publicar proyectos comunitarios, detallar materiales o servicios y recibir aportes de mi comunidad.
                      </p>
                    </div>
                  </button>

                  {/* Aportante / Colaborador (backer) */}
                  <button
                    type="button"
                    onClick={() => setRegRole('backer')}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer hover:bg-slate-50/50 ${
                      regRole === 'backer'
                        ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      regRole === 'backer' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 leading-none">Aportante / Colaborador</p>
                      <p className="text-[10px] text-slate-500 leading-normal mt-1">
                        Quiero ver los proyectos comunitarios, apoyarlos comprando insumos enteros o aportando un porcentaje para lograrlos.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 cursor-pointer text-center"
                >
                  Habilitar mi Cuenta y Comenzar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingRegistrationUser(null);
                    handleLogout();
                  }}
                  className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer text-center"
                >
                  Volver / Cancelar
                </button>
              </div>

            </form>
          </div>
        </div>
      );
    }

    // Pantalla de Login Principal
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 p-4">
        {alertMessage && (
          <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all animate-bounce ${
            alertMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <Sparkles className={`w-5 h-5 ${alertMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`} />
            <span className="text-xs font-bold">{alertMessage.text}</span>
          </div>
        )}

        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 space-y-6 text-center">
          
          {/* Logo y Encabezado */}
          <div className="space-y-3">
            <div className="relative mx-auto w-16 h-16 rounded-3xl overflow-hidden shadow-md border-2 border-white ring-4 ring-blue-100">
              <img 
                src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=150&auto=format&fit=crop&q=80" 
                alt="VaquitaApp Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">VaquitaApp</h1>
              <p className="text-[10px] text-blue-600 font-extrabold tracking-wider uppercase">Plataforma de Crowdfunding</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Colabora en proyectos comunitarios transparentes, financia insumos y haz realidad las ideas de tu comunidad de forma unificada.
            </p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl flex items-start gap-2.5 text-xs text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-4">
            {supabaseConfig.isConnected && (
              <>
                {/* Opción 1: Login Real con Google */}
                <div className="space-y-2">
                  <button
                    onClick={handleRealGoogleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 018 12.5a5.99 5.99 0 015.991-6.014c1.558 0 2.902.593 3.935 1.557l3.07-3.07C19.141 3.115 16.733 2 13.99 2 8.473 2 4 6.473 4 12s4.473 10 9.99 10c5.77 0 9.814-4.057 9.814-9.99 0-.6-.054-1.18-.15-1.725H12.24z"/>
                    </svg>
                    <span>Iniciar Sesión Real con Google</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowLoginHelp(!showLoginHelp)}
                    className="w-full text-slate-500 hover:text-slate-800 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer hover:underline py-1"
                  >
                    <span>{showLoginHelp ? '▲ Ocultar ayuda de configuración' : '❓ ¿Problemas con Google Sign-In? Ver solución'}</span>
                  </button>
                  
                  {showLoginHelp && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 text-left leading-relaxed animate-fadeIn">
                      <span className="font-bold flex items-center gap-1 mb-0.5 text-amber-900">
                        ⚠️ ¿Error "Unsupported provider"?
                      </span>
                      Si te aparece este error, significa que debes <strong>activar el proveedor Google</strong> en tu consola de Supabase (<strong>Authentication → Sign In / Providers → Google → ON</strong>) y configurar tus llaves de Google.
                      <p className="mt-1 font-semibold text-slate-700">
                        💡 Solución alternativa inmediata:
                      </p>
                      Escribe tu dirección de Gmail en el recuadro de abajo e ingresa directamente en modo simulación (sin requerir configurar Google Auth).
                    </div>
                  )}
                </div>

                {/* Separador */}
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">o ingresa directamente</span>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>
              </>
            )}

            {/* Opción 2: Formulario de Correo de Gmail (Simulador o directo) */}
            <form onSubmit={(e) => {
              e.preventDefault();
              setLoginError('');
              
              const emailTrimmed = loginGmailInput.trim().toLowerCase();
              if (!emailTrimmed) {
                setLoginError('Por favor, ingresa tu dirección de Gmail.');
                return;
              }
              
              // Validar que termine con @gmail.com
              if (!emailTrimmed.endsWith('@gmail.com')) {
                setLoginError('Por seguridad, el login requiere exclusivamente una dirección de correo de Gmail (@gmail.com).');
                return;
              }

              // Procesar el inicio de sesión
              let computedName = emailTrimmed.split('@')[0];
              // Capitalizar primer letra del nombre simulado
              computedName = computedName.charAt(0).toUpperCase() + computedName.slice(1);
              
              // Si es Daniel, darle su nombre real completo
              if (emailTrimmed === 'schaferdc@gmail.com') {
                computedName = 'Daniel Schafer';
              }

              handleProcessLogin(emailTrimmed, computedName, `sim-${Math.random().toString(36).substr(2, 9)}`);
            }} className="space-y-3 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Tu dirección de Gmail
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  value={loginGmailInput}
                  onChange={(e) => setLoginGmailInput(e.target.value)}
                  className="w-full text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-xs transition duration-200 text-center cursor-pointer"
              >
                Ingresar con Gmail
              </button>
            </form>
          </div>

          {/* Footer del login */}
          <p className="text-[10px] text-slate-400 leading-normal pt-2 border-t border-slate-100">
            🔒 Autenticación protegida de extremo a extremo. Al acceder, confirmas que estás de acuerdo con nuestras pautas de uso transparente de fondos.
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Toast Alert Banner */}
      {alertMessage && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all animate-bounce ${
          alertMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <Sparkles className={`w-5 h-5 ${alertMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`} />
          <span className="text-xs font-bold">{alertMessage.text}</span>
        </div>
      )}

      {/* Header / Google Auth Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedProjectId(null); setActiveTab('dashboard'); }}>
            <img 
              src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=150&auto=format&fit=crop&q=80" 
              alt="VaquitaApp Logo" 
              className="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-100"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight leading-none">VaquitaApp</h1>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5 tracking-wider uppercase">Plataforma Crowdfunding</p>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => { setSelectedProjectId(null); setActiveTab('dashboard'); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'dashboard' && !selectedProjectId
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Proyectos
            </button>
            <button
              onClick={() => { setSelectedProjectId(null); setActiveTab('contributions'); }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'contributions'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Mis Aportes</span>
              {pendingTicketsCount > 0 && (
                <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingTicketsCount}
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => { setSelectedProjectId(null); setActiveTab('admin'); }}
                className={`px-3 py-1.5 rounded-lg transition relative group ${
                  activeTab === 'admin'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Panel de Admin
                {(totalAdminPendingCount > 0 || adminEmails.filter(e => !e.is_read).length > 0) && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                
                {/* Tooltip explicativo del punto rojo */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none w-64 sm:w-72 transition-all duration-250">
                  <div className="w-2.5 h-2.5 bg-slate-800 rotate-45 -mb-1 shadow-sm"></div>
                  <div className="bg-slate-800 text-white text-[10px] sm:text-xs font-normal p-3 rounded-xl shadow-xl border border-slate-700 text-center leading-normal">
                    {totalAdminPendingCount > 0 || adminEmails.filter(e => !e.is_read).length > 0 ? (
                      <>
                        <span className="font-bold text-amber-400 block mb-1">● Tareas Pendientes</span>
                        {totalAdminPendingCount > 0 && (
                          <p className="mb-1 text-left text-[11px]">
                            Hay{' '}
                            {pendingProjectsCount > 0 && (
                              <span>
                                <strong>{pendingProjectsCount}</strong> proyecto{pendingProjectsCount > 1 ? 's' : ''} pendiente{pendingProjectsCount > 1 ? 's' : ''} de habilitación
                              </span>
                            )}
                            {pendingProjectsCount > 0 && pendingContributionsCount > 0 && ' y '}
                            {pendingContributionsCount > 0 && (
                              <span>
                                <strong>{pendingContributionsCount}</strong> comprobante{pendingContributionsCount > 1 ? 's' : ''} por validar
                              </span>
                            )}
                            .
                          </p>
                        )}
                        {adminEmails.filter(e => !e.is_read).length > 0 && (
                          <p className="text-left text-sky-300 font-bold text-[11px] mt-1 border-t border-slate-700/50 pt-1">
                            📧 Tienes {adminEmails.filter(e => !e.is_read).length} correo{adminEmails.filter(e => !e.is_read).length > 1 ? 's' : ''} nuevo{adminEmails.filter(e => !e.is_read).length > 1 ? 's' : ''} en tu bandeja de entrada de Mercado Pago.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-emerald-400 block mb-1">✔ Todo al Día</span>
                        No hay proyectos pendientes de habilitación, comprobantes de pago por validar ni correos sin leer en este momento.
                      </>
                    )}
                  </div>
                </div>
              </button>
            )}
            {/* Conectar Supabase option hidden for now */}
            {/* isAdmin && (
              <button
                onClick={() => { setSelectedProjectId(null); setActiveTab('settings'); }}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Conectar Supabase</span>
              </button>
            ) */}
          </nav>

          {/* Active User Google Auth UI */}
          <div className="flex items-center gap-3">
            {supabaseConfig.isConnected ? (
              supabaseError ? (
                <button
                  onClick={() => { 
                    if (isAdmin) {
                      setSelectedProjectId(null); 
                      setActiveTab('admin'); 
                    } else {
                      showAlert('error', 'Solo los administradores autorizados pueden configurar o diagnosticar Supabase.');
                    }
                  }}
                  className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100 font-bold flex items-center gap-1 cursor-pointer hover:bg-red-100 transition"
                  title={isAdmin ? `Error de Conexión: ${supabaseError}. Haz clic para ver y solucionar.` : `Error de Conexión a Supabase.`}
                >
                  🔴 Error Supabase
                </button>
              ) : (
                <button
                  onClick={() => { 
                    if (isAdmin) {
                      setSelectedProjectId(null); 
                      setActiveTab('admin'); 
                    } else {
                      showAlert('success', 'Conectado a la base de datos de Supabase en la nube.');
                    }
                  }}
                  className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-100 transition"
                  title="Conectado a Supabase correctamente."
                >
                  🟢 Supabase
                </button>
              )
            ) : (
              <button
                onClick={() => { 
                  if (isAdmin) {
                    setSelectedProjectId(null); 
                    setActiveTab('admin'); 
                  } else {
                    showAlert('error', 'Modo Local activo. El administrador debe conectar Supabase.');
                  }
                }}
                className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-100 transition"
                title="Modo Local. Los datos se guardan en este navegador."
              >
                🟠 Modo Local
              </button>
            )}
            {activeUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 pr-3 rounded-full">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                  {activeUser.full_name.charAt(0)}
                </div>
                <div className="text-left shrink max-w-32 sm:max-w-44 truncate">
                  <p className="text-[10px] font-extrabold text-slate-800 leading-none truncate">{activeUser.full_name}</p>
                  <p className="text-[8px] font-mono text-slate-400 leading-none mt-0.5 truncate">{activeUser.email}</p>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={supabaseConfig.isConnected ? handleRealGoogleLogin : () => {
                  setActiveTab('admin');
                  showAlert('error', 'Supabase no está conectado aún. Inicia sesión en modo demo como administrador para configurarlo en el Panel de Admin.');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-full shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{supabaseConfig.isConnected ? 'Iniciar sesión (Google)' : 'Acceder (Demo)'}</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        {/* VIEW: PROJECT DETAILS */}
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            components={components}
            contributions={contributions}
            activeUser={activeUser}
            onBackToList={() => setSelectedProjectId(null)}
            onAddContribution={handleAddContribution}
            onAddComponent={handleAddComponent}
            onDeleteComponent={handleDeleteComponent}
            onApproveContribution={handleApproveContribution}
            onRejectContribution={handleRejectContribution}
            onUpdateProjectDates={handleUpdateProjectDates}
            onSoftDeleteProject={handleSoftDeleteProject}
            onRestoreProject={handleRestoreProject}
            onToggleProjectApproval={handleToggleProjectApproval}
            onSendAdminEmail={handleSendAdminEmail}
            onEdit={handleOpenEditProject}
            adminFeeMin={adminFeeMin}
            adminFeeMax={adminFeeMax}
            adminFeePercent={adminFeePercent}
            adminMinValidityDays={adminMinValidityDays}
            adminMaxValidityMonths={adminMaxValidityMonths}
          />
        ) : (
          <>
            {/* VIEW: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                
                {/* Aggregate Progression Panel (Main Hero) - Visible only to Administrator */}
                {isAdmin && (
                  <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-7 space-y-4">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                        Progreso Global Comunitario (Solo Visible por Administradores)
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                        Aporta a proyectos, impulsa tu comunidad
                      </h2>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-xl">
                        Plataforma de crowdfunding transparente. Los dueños listan materiales o servicios, y los aportantes colaboran comprando unidades o aportando un porcentaje para insumos costosos.
                      </p>
                    </div>

                    <div className="md:col-span-5 bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-4">
                      <div className="flex justify-between items-end text-xs">
                        <span className="text-slate-500 font-semibold">Total Recaudado</span>
                        <span className="text-blue-700 font-extrabold text-sm">{globalProgressPercentage}%</span>
                      </div>

                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300/20">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700"
                          style={{ width: `${globalProgressPercentage}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                        <div>
                          <p className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Aportado Global</p>
                          <p className="text-sm font-bold text-slate-800">${globalFundedFunding.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Meta Financiar</p>
                          <p className="text-sm font-bold text-blue-800">${globalRequiredFunding.toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Filters, Search and Actions bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Search and Category filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por ID de proyecto o nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl">
                      <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as any)}
                        className="text-xs bg-transparent focus:outline-hidden text-slate-600 font-medium pr-1 cursor-pointer"
                      >
                        <option value="all">Todas las Categorías</option>
                        <option value="construction">Infraestructura</option>
                        <option value="party">Fiestas / Cervezas</option>
                        <option value="event">Eventos</option>
                        <option value="other">Otros</option>
                      </select>
                    </div>
                  </div>

                  {/* Create project triggering (Only owner or admin can) */}
                  {activeUser && (activeUser.role === 'admin' || activeUser.role === 'owner') && (
                    <button
                      onClick={() => {
                        if (!showCreateProjectForm) {
                          const today = new Date();
                          const todayStr = today.toLocaleDateString('en-CA');
                          const end = new Date(today);
                          end.setMonth(today.getMonth() + adminMaxValidityMonths);
                          const endStr = end.toLocaleDateString('en-CA');
                          setNewProjectStartDate(todayStr);
                          setNewProjectEndDate(endStr);
                        }
                        setShowCreateProjectForm(!showCreateProjectForm);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Proyecto</span>
                    </button>
                  )}
                </div>

                {/* Create Project Form (Drawer/Card) */}
                {showCreateProjectForm && (
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl animate-slide-down space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                        Lanzar Nuevo Proyecto de Financiamiento
                      </h3>
                      <button 
                        onClick={() => setShowCreateProjectForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleCreateProject} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex justify-between">
                            <span>ID Único (Máx. 15 caracteres)</span>
                            <span className="text-slate-400 font-mono">{newProjectId.length}/15</span>
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Ej. REMODEL-BAÑOS"
                              value={newProjectId}
                              maxLength={15}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const sanitized = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                                setNewProjectId(sanitized);
                              }}
                              className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-mono font-bold shrink-0"
                              style={{ width: 'calc(100% - 85px)' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newProjectId) {
                                  showAlert('error', 'Por favor, ingrese un ID para validar.');
                                  return;
                                }
                                const sanitized = newProjectId.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                                if (sanitized.length > 15) {
                                  showAlert('error', 'El ID supera los 15 caracteres.');
                                  return;
                                }
                                const exists = projects.some(p => p.id === sanitized);
                                if (exists) {
                                  showAlert('error', `El ID "${sanitized}" ya existe en la base de datos.`);
                                } else {
                                  showAlert('success', `¡El ID "${sanitized}" está disponible!`);
                                }
                              }}
                              className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl transition cursor-pointer border border-slate-200 shrink-0 text-center"
                              style={{ width: '80px' }}
                            >
                              Validar
                            </button>
                          </div>
                          {/* Online Validation Status Info */}
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold leading-tight min-h-[14px]">
                            {!newProjectId ? (
                              <span className="text-slate-400">Permite letras, números y guiones.</span>
                            ) : projects.some(p => p.id === newProjectId) ? (
                              <span className="text-red-500 flex items-center gap-0.5">
                                <X className="w-3 h-3 text-red-500 shrink-0" />
                                No disponible (Existe en BBDD)
                              </span>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-0.5">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                ID único y disponible
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Nombre del Proyecto / Evento
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Refacción de Sanitarios Club Urquiza"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Breve Descripción del Fin Comunitaria
                          </label>
                          <input
                            type="text"
                            placeholder="Describa para qué se utilizarán los fondos..."
                            value={newProjectDesc}
                            onChange={(e) => setNewProjectDesc(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Categoría del Proyecto
                          </label>
                          <select
                            value={newProjectCategory}
                            onChange={(e) => setNewProjectCategory(e.target.value as any)}
                            className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                          >
                            <option value="construction">Construcción / Obra</option>
                            <option value="party">Fiesta / Cumpleaños</option>
                            <option value="event">Evento Público</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                      </div>

                      {/* Fechas de Vigencia */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-150 rounded-2xl p-4 bg-blue-50/20">
                        <div className="md:col-span-2">
                          <h4 className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Vigencia del Proyecto o Evento
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                            Defina el rango de fechas para la validez de los aportes. Los usuarios solo podrán realizar aportaciones dentro de este período.
                          </p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Fecha de Inicio
                          </label>
                          <input
                            type="date"
                            value={newProjectStartDate}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              setNewProjectStartDate(newStart);
                              if (newStart) {
                                const d = new Date(newStart + 'T00:00:00');
                                d.setMonth(d.getMonth() + adminMaxValidityMonths);
                                setNewProjectEndDate(d.toLocaleDateString('en-CA'));
                              }
                            }}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Fecha de Fin
                          </label>
                          <input
                            type="date"
                            min={newProjectStartDate}
                            value={newProjectEndDate}
                            onChange={(e) => setNewProjectEndDate(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Información de Pago */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-150 rounded-2xl p-4 bg-amber-50/30">
                        <div className="md:col-span-2">
                          <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Coordenadas de Transferencia (CBU / Alias)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                            Ingresa los datos bancarios o virtuales de cobro. Los aportantes transferirán su aporte a esta cuenta y luego cargarán el comprobante con la referencia o Nro de Operación.
                          </p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Alias de Pago
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: CLUB.URQUIZA.MP"
                            value={newProjectAlias}
                            onChange={(e) => setNewProjectAlias(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            CBU o CVU (22 dígitos)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 0000003100012345678901"
                            value={newProjectCbu}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setNewProjectCbu(value.substring(0, 22));
                            }}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Banner del Proyecto */}
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Banner del Proyecto o Evento (Panorámica / Propaganda)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Se mostrará como cabecera/propaganda del proyecto cuando los aportantes ingresen a colaborar. 
                          <span className="font-semibold block mt-1 text-blue-700 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/55">
                            💡 Formato Recomendado: Imagen panorámica u horizontal apaisada (proporción 16:9 o 3:1) en formato <strong>JPG, PNG o WebP</strong> (ej: 1200x400 px) para un ajuste impecable.
                          </span>
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                              URL del Banner del Proyecto
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: https://images.unsplash.com/... o enlace de propaganda"
                              value={newProjectBannerUrl}
                              onChange={(e) => setNewProjectBannerUrl(e.target.value)}
                              className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">
                                Banners Rápidos de Muestra
                              </label>
                              <div className="flex gap-2">
                                {[
                                  { name: 'Obras/Club', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200&h=400' },
                                  { name: 'Fiesta/Fin', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200&h=400' },
                                  { name: 'Concierto/Show', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200&h=400' }
                                ].map((preset) => (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                      setNewProjectBannerUrl(preset.url);
                                      showAlert('success', `Banner predefinido "${preset.name}" seleccionado.`);
                                    }}
                                    className={`text-[9px] px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                                      newProjectBannerUrl === preset.url 
                                        ? 'bg-blue-600 border-blue-600 text-white' 
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {newProjectBannerUrl && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Vista Previa del Banner:</span>
                                <div className="h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                  <img 
                                    src={newProjectBannerUrl} 
                                    alt="Preview Banner" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as any).src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=150&auto=format&fit=crop&q=80';
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Documento Adjunto del Proyecto (PDF o Imagen) */}
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Documento Adjunto (Opcional - PDF o Imagen)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Cargue un archivo PDF o imagen descriptiva que detalle el propósito, planos o presupuestos del proyecto.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <span>Seleccionar Archivo</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 3 * 1024 * 1024) {
                                    showAlert('error', 'El archivo no debe superar los 3 MB.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    setNewProjectDocumentUrl(evt.target?.result as string);
                                    setNewProjectDocumentName(file.name);
                                    showAlert('success', `Archivo "${file.name}" cargado con éxito.`);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {newProjectDocumentName ? (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
                              <span className="truncate max-w-[200px]">{newProjectDocumentName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewProjectDocumentUrl('');
                                  setNewProjectDocumentName('');
                                }}
                                className="text-emerald-600 hover:text-emerald-900 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Ningún archivo seleccionado</span>
                          )}
                        </div>
                      </div>

                      {/* Reel de Fotos del Proyecto (Máximo 8) */}
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Reel de Fotos del Proyecto (Hasta 8 imágenes)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Agregue fotos que estén relacionadas con la obra, evento o terreno del proyecto.
                        </p>
                        
                        <div className="space-y-3">
                          <label className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer text-xs font-bold text-slate-700 flex inline-flex items-center gap-1.5 shadow-2xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 47.86 0 0 0-3.472 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                            </svg>
                            <span>Agregar Foto ({newProjectPhotoReel.length}/8)</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              disabled={newProjectPhotoReel.length >= 8}
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []) as File[];
                                if (newProjectPhotoReel.length + files.length > 8) {
                                  showAlert('error', 'Solo puede cargar un máximo de 8 fotos en el reel.');
                                  return;
                                }
                                
                                files.forEach((file) => {
                                  if (file.size > 800 * 1024) {
                                    showAlert('error', `La foto "${file.name}" supera los 800KB. Utilice una imagen de menor peso.`);
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const resStr = evt.target?.result as string;
                                    setNewProjectPhotoReel((prev) => [...prev, resStr]);
                                  };
                                  reader.readAsDataURL(file);
                                });
                              }}
                            />
                          </label>

                          {newProjectPhotoReel.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                              {newProjectPhotoReel.map((img, i) => (
                                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                  <img src={img} className="w-full h-full object-cover" alt="Reel image" referrerPolicy="no-referrer" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewProjectPhotoReel((prev) => prev.filter((_, idx) => idx !== i));
                                    }}
                                    className="absolute inset-0 bg-red-600/70 text-white font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px]"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Avatar del Proyecto */}
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Avatar / Imagen del Proyecto o Evento
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Personalice el proyecto con una imagen única. Puede subir una imagen, arrastrarla aquí, pegar una URL, o seleccionar un diseño predefinido.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Drag & Drop Area */}
                          <div 
                            onDragEnter={handleAvatarDrag}
                            onDragOver={handleAvatarDrag}
                            onDragLeave={handleAvatarDrag}
                            onDrop={handleAvatarDrop}
                            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition cursor-pointer relative min-h-[120px] ${
                              dragActive 
                                ? 'border-blue-500 bg-blue-50/30' 
                                : newProjectAvatarUrl 
                                ? 'border-emerald-300 bg-emerald-50/10' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <input 
                              type="file" 
                              id="avatar-upload"
                              accept="image/*"
                              onChange={handleAvatarFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {newProjectAvatarUrl ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <img 
                                  src={newProjectAvatarUrl} 
                                  alt="Preview" 
                                  className="w-12 h-12 rounded-full object-cover border border-emerald-500 shadow-xs"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[10px] font-bold text-emerald-600">¡Imagen cargada!</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setNewProjectAvatarUrl('');
                                  }}
                                  className="text-[9px] text-red-500 hover:underline font-bold cursor-pointer"
                                >
                                  Eliminar y cambiar
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Plus className="w-5 h-5 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-600">
                                  Arrastre una imagen aquí o <span className="text-blue-600 underline">busque un archivo</span>
                                </span>
                                <span className="text-[9px] text-slate-400 font-sans">PNG, JPG, GIF de hasta 2MB</span>
                              </div>
                            )}
                          </div>

                          {/* URL input and presets */}
                          <div className="space-y-3 flex flex-col justify-between">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                O ingrese la URL de la imagen
                              </label>
                              <input
                                type="text"
                                placeholder="https://ejemplo.com/imagen.jpg"
                                value={newProjectAvatarUrl.startsWith('data:') ? '' : newProjectAvatarUrl}
                                onChange={(e) => setNewProjectAvatarUrl(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                Diseños Rápidos Predefinidos
                              </label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { name: 'Vaquita', url: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=150&auto=format&fit=crop&q=80' },
                                  { name: 'Obras', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&auto=format&fit=crop&q=80' },
                                  { name: 'Fiesta', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=150&auto=format&fit=crop&q=80' },
                                  { name: 'Asado', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&auto=format&fit=crop&q=80' },
                                ].map((preset) => (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                      setNewProjectAvatarUrl(preset.url);
                                      showAlert('success', `Avatar predefinido "${preset.name}" seleccionado.`);
                                    }}
                                    className={`relative rounded-lg overflow-hidden border-2 h-10 transition group cursor-pointer ${
                                      newProjectAvatarUrl === preset.url ? 'border-blue-500 scale-95 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                    title={preset.name}
                                  >
                                    <img 
                                      src={preset.url} 
                                      alt={preset.name} 
                                      className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-[8px] text-white py-0.5 text-center font-bold">
                                      {preset.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Grid of requirements/supplies */}
                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div>
                            <h4 className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                              Grilla de Requerimientos e Insumos del Proyecto
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Defina cada uno de los insumos o servicios que necesita financiar en esta grilla con las columnas necesarias.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewProjectComponentsGrid([
                                  ...newProjectComponentsGrid,
                                  { name: '', quantity: 1, price: 1000, thank_you_threshold_percent: 50 }
                                ]);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Agregar Ítem</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('¿Desea vaciar todos los elementos de la grilla?')) {
                                  setNewProjectComponentsGrid([]);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Vaciar</span>
                            </button>
                          </div>
                        </div>

                        {newProjectComponentsGrid.length === 0 ? (
                          <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-xl">
                            <p className="text-xs text-slate-400 font-medium">La grilla está vacía. Presione "Agregar Ítem" para comenzar.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-150 bg-white">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold">
                                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                                  <th className="py-2.5 px-3 min-w-[200px]">Insumo / Servicio Requerido</th>
                                  <th className="py-2.5 px-3 w-20">Cantidad</th>
                                  <th className="py-2.5 px-3 w-28">Precio Unitario ($)</th>
                                  <th className="py-2.5 px-3 w-24 text-center">Umbral Agradec. (%)</th>
                                  <th className="py-2.5 px-3 w-32 text-right">Total Est.</th>
                                  <th className="py-2.5 px-3 w-16 text-center">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {newProjectComponentsGrid.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/55 transition-colors">
                                    <td className="py-2 px-3 text-slate-400 text-center font-mono font-bold">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        placeholder="Ej: Bolsas de Cemento Loma Negra"
                                        value={item.name}
                                        onChange={(e) => {
                                          const updated = [...newProjectComponentsGrid];
                                          updated[idx].name = e.target.value;
                                          setNewProjectComponentsGrid(updated);
                                        }}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50/30"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={item.quantity || ''}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          const updated = [...newProjectComponentsGrid];
                                          updated[idx].quantity = isNaN(val) ? 0 : val;
                                          setNewProjectComponentsGrid(updated);
                                        }}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50/30 font-semibold"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="1000"
                                        value={item.price || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          const updated = [...newProjectComponentsGrid];
                                          updated[idx].price = isNaN(val) ? 0 : val;
                                          setNewProjectComponentsGrid(updated);
                                        }}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50/30 font-semibold"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="50"
                                        value={item.thank_you_threshold_percent || 50}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          const updated = [...newProjectComponentsGrid];
                                          updated[idx].thank_you_threshold_percent = isNaN(val) ? 50 : val;
                                          setNewProjectComponentsGrid(updated);
                                        }}
                                        className="w-full px-2 px-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50/30 text-center font-semibold"
                                        title="Porcentaje de aporte para mostrar cartel de agradecimiento especial"
                                      />
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-700 font-mono">
                                      ${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-AR')}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = newProjectComponentsGrid.filter((_, i) => i !== idx);
                                          setNewProjectComponentsGrid(updated);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                        title="Eliminar fila"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* Summary row */}
                            <div className="bg-slate-50 p-3 flex justify-between items-center border-t border-slate-150 font-extrabold text-slate-800">
                              <span className="text-[10px] uppercase text-slate-500">Monto Total Estimado del Proyecto:</span>
                              <span className="text-sm font-black text-blue-700 font-mono">
                                ${newProjectComponentsGrid.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0).toLocaleString('es-AR')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {createProjectError && (
                        <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 border border-red-100 rounded-xl">
                          {createProjectError}
                        </p>
                      )}

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateProjectForm(false)}
                          className="text-slate-500 hover:bg-slate-100 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition cursor-pointer shadow-xs"
                        >
                          Crear Proyecto e Insumos
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Projects Grid Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white border border-dashed border-slate-200 rounded-3xl">
                      <p className="text-xs text-slate-400 font-medium">No se encontraron proyectos con los filtros indicados.</p>
                    </div>
                  ) : (
                    filteredProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        components={components}
                        onSelect={() => setSelectedProjectId(p.id)}
                        onEdit={(activeUser?.role === 'admin' || activeUser?.id === p.owner_id) ? handleOpenEditProject : undefined}
                      />
                    ))
                  )}
                </div>

              </div>
            )}

            {/* VIEW: ADMIN CONSOLE (schaferdc@gmail.com) */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Cartel Elegante de Tareas Pendientes (Look & Feel de Alto Impacto) */}
                {(() => {
                  const pendingProjs = projects.filter(p => !p.is_approved);
                  const pendingContribs = contributions.filter(c => c.status === 'pending');
                  const totalPending = pendingProjs.length + pendingContribs.length;

                  if (totalPending > 0) {
                    return (
                      <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-l-4 border-amber-500 p-5 rounded-2xl shadow-md border border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse-slow">
                        <div className="flex items-start gap-3.5">
                          <div className="p-3 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-200/50 shrink-0">
                            <ShieldAlert className="w-6 h-6 text-amber-600 animate-bounce" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm tracking-tight uppercase flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                              Tareas Pendientes de Revisión
                            </h4>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              Tienes <strong className="text-amber-800 font-extrabold">{pendingProjs.length}</strong> {pendingProjs.length === 1 ? 'proyecto pendiente' : 'proyectos pendientes'} de habilitación y{' '}
                              <strong className="text-amber-800 font-extrabold">{pendingContribs.length}</strong> {pendingContribs.length === 1 ? 'comprobante' : 'comprobantes'} por validar. Navega a continuación para resolverlas.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="bg-amber-600 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs flex items-center gap-1.5">
                            {totalPending} pendientes
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 p-5 rounded-2xl shadow-sm border border-emerald-200/60 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-emerald-500/10 text-emerald-700 rounded-xl border border-emerald-200/50 shrink-0">
                            <Check className="w-6 h-6 text-emerald-600 font-black" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">Consola al Día</h4>
                            <p className="text-xs text-emerald-800/80 font-semibold mt-0.5">Todo al día ✔ No tienes proyectos ni comprobantes pendientes de validación.</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Admin Header Stats */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-500" /> Consola de Administración (Daniel Schafer)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Supervisión absoluta de proyectos de construcción, fiestas, y la gestión de cupones emitidos.</p>
                  </div>
                </div>

                {/* BOARD FOR PROJECT APPROVALS & SERVICE FEE VERIFICATION (TK SERVICIO) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                      <div className="p-1 bg-amber-50 rounded-lg border border-amber-200">
                        <Database className="w-4 h-4 text-amber-600" />
                      </div>
                      Habilitación de Proyectos y Validación de Pago de Servicio (Vigencia Final)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Cada proyecto requiere el pago del servicio de CROWDFOUNDING por un valor del <strong>{adminFeePercent}% del total</strong> del presupuesto (con un tope mínimo de <strong>${adminFeeMin.toLocaleString('es-AR')}</strong> y un máximo de <strong>${adminFeeMax.toLocaleString('es-AR')}</strong>) transferido al alias <strong className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded select-all font-bold">gestalu2026.dni</strong>. Valide la transferencia aquí para dar el OK final y poner en vigencia el evento/proyecto.
                    </p>

                    {/* Panel de Configuración de Parámetros de Administración */}
                    <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="col-span-full border-b border-slate-200/60 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                          <Settings className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" /> Configuración de Parámetros de Administración
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Persistencia Local</span>
                      </div>
                      
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Comisión (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={adminFeePercent}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setAdminFeePercent(isNaN(val) ? 0 : val);
                            }}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Mínimo ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={adminFeeMin}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setAdminFeeMin(isNaN(val) ? 0 : val);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Máximo ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={adminFeeMax}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setAdminFeeMax(isNaN(val) ? 0 : val);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Vigencia Mín (Días)</label>
                        <input
                          type="number"
                          min="1"
                          value={adminMinValidityDays}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setAdminMinValidityDays(isNaN(val) ? 1 : val);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Vigencia Máx (Meses)</label>
                        <input
                          type="number"
                          min="1"
                          value={adminMaxValidityMonths}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setAdminMaxValidityMonths(isNaN(val) ? 1 : val);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-full flex justify-end gap-2.5 border-t border-slate-200/55 pt-2">
                        <button
                          onClick={() => {
                            localStorage.setItem('vaquita_admin_fee_min', adminFeeMin.toString());
                            localStorage.setItem('vaquita_admin_fee_max', adminFeeMax.toString());
                            localStorage.setItem('vaquita_admin_fee_percent', adminFeePercent.toString());
                            localStorage.setItem('vaquita_admin_min_validity_days', adminMinValidityDays.toString());
                            localStorage.setItem('vaquita_admin_max_validity_months', adminMaxValidityMonths.toString());
                            showAlert('success', '¡Parámetros de administración guardados y aplicados exitosamente!');
                            logUserAction(activeUser?.email || 'admin', 'CONFIG_PARAMETROS', `Actualizó parámetros: Comisión ${adminFeePercent}%, Mín $${adminFeeMin}, Máx $${adminFeeMax}, Vigencia Mín ${adminMinValidityDays}d, Máx Meses ${adminMaxValidityMonths}m`);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-white" /> Guardar Parámetros
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter bar */}
                  <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="admin-approval-search"
                        type="text"
                        placeholder="Buscar por Título o Fecha de Inicio (ej: 01/06/2026 o 2026-06-01)..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="admin-approval-filter" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                        Filtrar por Task:
                      </label>
                      <select
                        id="admin-approval-filter"
                        value={adminStatusFilter}
                        onChange={(e) => setAdminStatusFilter(e.target.value as any)}
                        className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:border-blue-500 font-medium cursor-pointer"
                      >
                        <option value="all">Todas las Tasks</option>
                        <option value="approved">OK Vigente (Aprobados)</option>
                        <option value="pending">Pendientes de OK</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[9px] bg-slate-50/50">
                          <th className="py-2.5 px-3">
                            <button
                              id="sort-btn-id"
                              onClick={() => {
                                if (adminSortColumn === 'id') {
                                  setAdminSortDirection(adminSortDirection === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setAdminSortColumn('id');
                                  setAdminSortDirection('asc');
                                }
                              }}
                              className="hover:text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer focus:outline-hidden text-left"
                            >
                              ID PROY/EVENTO {adminSortColumn === 'id' ? (adminSortDirection === 'asc' ? '▲' : '▼') : '↕'}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">
                            <button
                              id="sort-btn-owner"
                              onClick={() => {
                                if (adminSortColumn === 'owner') {
                                  setAdminSortDirection(adminSortDirection === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setAdminSortColumn('owner');
                                  setAdminSortDirection('asc');
                                }
                              }}
                              className="hover:text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer focus:outline-hidden text-left"
                            >
                              OWNER {adminSortColumn === 'owner' ? (adminSortDirection === 'asc' ? '▲' : '▼') : '↕'}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">
                            <button
                              id="sort-btn-title"
                              onClick={() => {
                                if (adminSortColumn === 'title') {
                                  setAdminSortDirection(adminSortDirection === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setAdminSortColumn('title');
                                  setAdminSortDirection('asc');
                                }
                              }}
                              className="hover:text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer focus:outline-hidden text-left"
                            >
                              Título {adminSortColumn === 'title' ? (adminSortDirection === 'asc' ? '▲' : '▼') : '↕'}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">
                            <button
                              id="sort-btn-startdate"
                              onClick={() => {
                                if (adminSortColumn === 'startDate') {
                                  setAdminSortDirection(adminSortDirection === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setAdminSortColumn('startDate');
                                  setAdminSortDirection('asc');
                                }
                              }}
                              className="hover:text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer focus:outline-hidden text-left"
                            >
                              Fec Inicio {adminSortColumn === 'startDate' ? (adminSortDirection === 'asc' ? '▲' : '▼') : '↕'}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">Fec Fin</th>
                          <th className="py-2.5 px-3 text-right">Total Presupuestado</th>
                          <th className="py-2.5 px-3 text-right bg-amber-50/20 text-amber-900 border-x border-amber-100/10">SERVICIO</th>
                          <th className="py-2.5 px-3 text-center">Task (Acción Admin)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          // 1. Filter
                          const filtered = projects.filter((p) => {
                            const matchSearch = adminSearchQuery.trim() === '' || 
                              p.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                              p.start_date.includes(adminSearchQuery) ||
                              p.start_date.split('-').reverse().join('/').includes(adminSearchQuery);

                            const isApprovedBool = p.is_approved === true;
                            const matchStatus = adminStatusFilter === 'all' ||
                              (adminStatusFilter === 'approved' && isApprovedBool) ||
                              (adminStatusFilter === 'pending' && !isApprovedBool);

                            return matchSearch && matchStatus;
                          });

                          // 2. Sort
                          const sorted = [...filtered].sort((a, b) => {
                            let valueA: any = '';
                            let valueB: any = '';

                            switch (adminSortColumn) {
                              case 'id':
                                valueA = a.id.toLowerCase();
                                valueB = b.id.toLowerCase();
                                break;
                              case 'owner':
                                const ownerA = users.find(u => u.id === a.owner_id)?.full_name || '';
                                const ownerB = users.find(u => u.id === b.owner_id)?.full_name || '';
                                valueA = ownerA.toLowerCase();
                                valueB = ownerB.toLowerCase();
                                break;
                              case 'title':
                                valueA = a.name.toLowerCase();
                                valueB = b.name.toLowerCase();
                                break;
                              case 'startDate':
                                valueA = a.start_date;
                                valueB = b.start_date;
                                break;
                              default:
                                valueA = a.id.toLowerCase();
                                valueB = b.id.toLowerCase();
                            }

                            if (valueA < valueB) return adminSortDirection === 'asc' ? -1 : 1;
                            if (valueA > valueB) return adminSortDirection === 'asc' ? 1 : -1;
                            return 0;
                          });

                          if (sorted.length === 0) {
                            return (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                                  No se encontraron proyectos con los filtros de búsqueda especificados.
                                </td>
                              </tr>
                            );
                          }

                          return sorted.map((p) => {
                            const pComps = components.filter((c) => c.project_id === p.id);
                            const totalCost = pComps.reduce((sum, c) => sum + c.total_price, 0);
                            const tkServicioRaw = totalCost * (adminFeePercent / 100);
                            const tkServicio = Math.max(adminFeeMin, Math.min(adminFeeMax, tkServicioRaw));
                            
                            const owner = users.find(u => u.id === p.owner_id);

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-blue-700">{p.id}</td>
                                <td className="py-3 px-3">
                                  {owner ? (
                                    <div>
                                      <div className="font-bold text-slate-800">{owner.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{owner.email}</div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-mono text-[10px]">{p.owner_id}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-800 max-w-[180px] truncate" title={p.name}>
                                  {p.name}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-600">
                                  {p.start_date.split('-').reverse().join('/')}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-600">
                                  {p.end_date.split('-').reverse().join('/')}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-slate-700">
                                  ${totalCost.toLocaleString('es-AR')}
                                </td>
                                <td className="py-3 px-3 text-right font-black bg-amber-50/10 text-amber-800 border-x border-amber-100/15">
                                  <div>
                                    ${tkServicio.toLocaleString('es-AR')}
                                  </div>
                                  <div className="text-[8px] text-slate-400 font-medium">
                                    ({adminFeePercent}% de {totalCost > 0 ? `$${totalCost.toLocaleString('es-AR')}` : '$0'})
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {p.is_approved ? (
                                      <>
                                        <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 shrink-0">
                                          <Check className="w-2.5 h-2.5 text-emerald-600" /> OK Vigente
                                        </span>
                                        <button
                                          onClick={() => handleToggleProjectApproval(p.id, false)}
                                          className="text-[10px] text-rose-600 hover:bg-rose-50 px-2 py-1 border border-rose-200 rounded font-bold transition cursor-pointer"
                                        >
                                          Denegar OK
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="bg-amber-50 text-amber-700 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded border border-amber-200 flex items-center gap-0.5 shrink-0 animate-pulse">
                                          Pendiente
                                        </span>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleToggleProjectApproval(p.id, true)}
                                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded font-bold transition cursor-pointer shadow-2xs flex items-center gap-0.5"
                                          >
                                            <Check className="w-2.5 h-2.5 text-white" /> Aprobar
                                          </button>
                                          <button
                                            onClick={() => handleToggleProjectApproval(p.id, false)}
                                            className="text-[10px] text-rose-600 hover:bg-rose-50 px-2 py-1 border border-rose-200 rounded font-bold transition cursor-pointer"
                                          >
                                            Denegar
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BANDEJA DE ENTRADA DE EMAILS (Doble Notificación Mercado Pago) */}
                <div id="admin-email-inbox" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-50 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                        <Database className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2 flex-wrap">
                          <span>Buzón de Alertas por Mail</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal tracking-normal lowercase">(schaferdc@gmail.com)</span>
                          {adminEmails.filter(e => !e.is_read).length > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                              {adminEmails.filter(e => !e.is_read).length} NUEVOS
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Notificaciones de intenciones de pago y resultados de cobro por Mercado Pago en tiempo real.
                        </p>
                      </div>
                    </div>
                    {adminEmails.length > 0 && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            const updated = adminEmails.map(m => ({ ...m, is_read: true }));
                            setAdminEmails(updated);
                            localStorage.setItem(LS_ADMIN_EMAILS, JSON.stringify(updated));
                            showAlert('success', 'Todos los correos han sido marcados como leídos.');
                          }}
                          className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer bg-white"
                        >
                          Marcar todo leído
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('¿Está seguro de que desea vaciar la bandeja de entrada?')) {
                              setAdminEmails([]);
                              setSelectedEmailId(null);
                              localStorage.setItem(LS_ADMIN_EMAILS, JSON.stringify([]));
                              showAlert('success', 'Bandeja de entrada vaciada.');
                            }
                          }}
                          className="px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer bg-white"
                        >
                          Vaciar Bandeja
                        </button>
                      </div>
                    )}
                  </div>

                  {adminEmails.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-150 flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="max-w-md">
                        <h4 className="text-xs font-bold text-slate-700">Sin correos electrónicos en la bandeja</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cuando un creador inicie un pago de comisión o se acredite exitosamente, recibirás las alertas automáticas en este buzón.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/30">
                      {/* Mail List */}
                      <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-150 max-h-[360px] overflow-y-auto divide-y divide-slate-150 bg-white">
                        {adminEmails.map((email) => {
                          const isSelected = selectedEmailId === email.id || (!selectedEmailId && adminEmails[0].id === email.id);
                          if (isSelected && !selectedEmailId) {
                            // Sync selection state if not set
                            setTimeout(() => setSelectedEmailId(email.id), 0);
                          }
                          return (
                            <div
                              key={email.id}
                              onClick={() => {
                                setSelectedEmailId(email.id);
                                if (!email.is_read) {
                                  const updated = adminEmails.map(m => m.id === email.id ? { ...m, is_read: true } : m);
                                  setAdminEmails(updated);
                                  localStorage.setItem(LS_ADMIN_EMAILS, JSON.stringify(updated));
                                }
                              }}
                              className={`p-3.5 transition cursor-pointer text-left relative flex flex-col gap-1.5 ${
                                isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                              } ${!email.is_read ? 'border-l-4 border-blue-600' : ''}`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-slate-700 text-xs truncate max-w-[70%]">
                                  {email.sender_name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(email.received_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-slate-800 line-clamp-1">
                                {email.subject}
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                  email.type === 'payment_intent'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {email.type === 'payment_intent' ? 'Intención' : 'Pago OK'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(email.received_at).toLocaleDateString('es-AR')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mail Body View */}
                      <div className="lg:col-span-7 p-5 bg-white min-h-[300px] flex flex-col">
                        {(() => {
                          const currentEmail = adminEmails.find(m => m.id === selectedEmailId) || adminEmails[0];
                          if (!currentEmail) return null;
                          return (
                            <div className="space-y-4 text-left flex-1 flex flex-col">
                              {/* Header details */}
                              <div className="border-b border-slate-100 pb-3.5 space-y-1.5 shrink-0">
                                <div className="flex flex-wrap justify-between items-start gap-1">
                                  <h4 className="text-sm font-black text-slate-800 tracking-tight leading-snug">
                                    {currentEmail.subject}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(currentEmail.received_at).toLocaleString('es-AR')}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <p className="text-slate-500 font-medium">
                                    De: <strong className="text-slate-700">{currentEmail.sender_name}</strong> &lt;{currentEmail.sender_email}&gt;
                                  </p>
                                  <p className="text-slate-400 text-[10px]">
                                    Para: &lt;{currentEmail.recipient_email}&gt; (Administrador)
                                  </p>
                                </div>
                              </div>

                              {/* Mail Rich Body */}
                              <div className="flex-1 overflow-y-auto py-2">
                                <div 
                                  className="text-xs text-slate-600 leading-relaxed space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100"
                                  dangerouslySetInnerHTML={{ __html: currentEmail.body }}
                                />
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                                <span>Seguridad: Cifrado SSL verificado</span>
                                <span className="font-mono">ID: {currentEmail.id}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: Project delete management table */}
                  <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2">
                      Supervisión de Proyectos Activos
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                            <th className="py-2.5 px-3">Proyecto</th>
                            <th className="py-2.5 px-3">Categoría</th>
                            <th className="py-2.5 px-3 text-right">Costo Total</th>
                            <th className="py-2.5 px-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {projects.map((p) => {
                            const pComps = components.filter(c => c.project_id === p.id);
                            const pCost = pComps.reduce((sum, c) => sum + c.total_price, 0);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800">{p.name}</div>
                                  <div className="font-mono text-[9px] text-slate-400">ID: {p.id}</div>
                                </td>
                                <td className="py-3 px-3 capitalize text-slate-500">{p.category}</td>
                                <td className="py-3 px-3 text-right font-bold text-slate-700">${pCost.toLocaleString('es-AR')}</td>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => setSelectedProjectId(p.id)}
                                      className="text-blue-600 hover:bg-blue-50 px-2 py-1 border border-blue-200 rounded-md font-semibold text-[10px]"
                                    >
                                      Administrar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProject(p.id)}
                                      className="text-red-600 hover:bg-red-50 p-1 border border-red-200 rounded-md"
                                      title="Eliminar proyecto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right: Global contributions tracking */}
                  <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2">
                      Auditoría Global de Cupones Emitidos
                    </h3>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {contributions.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-medium">No hay cupones emitidos por el momento.</p>
                      ) : (
                        contributions.slice().reverse().map((c) => {
                          const compName = components.find(item => item.id === c.component_id)?.name || 'Insumo';
                          return (
                            <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                                    {c.project_id}
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 mt-1">{c.backer_name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{c.backer_email}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-slate-800">${c.amount.toLocaleString('es-AR')}</p>
                                  <button
                                    onClick={() => setActiveCoupon(c)}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 ml-auto"
                                  >
                                    <Ticket className="w-3 h-3" /> Ver Cupón
                                  </button>
                                </div>
                              </div>
                              <div className="border-t border-slate-200/60 pt-1.5 flex justify-between text-[10px] text-slate-500 font-mono">
                                <span>Item: {compName}</span>
                                <span className="text-amber-800 font-semibold">Destino: {c.company_alias}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Tracking and Audit Trails */}
                <ActivityLogView
                  actions={userActions}
                  onClearAllLogs={handleClearAllLogs}
                />

                {/* Supabase Connectivity & Validator Panel */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 mt-8">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      Configuración de Conexión a Supabase (Admin)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Configura las credenciales de tu proyecto de Supabase para habilitar la persistencia en tiempo real en la nube, la sincronización de aportes y el registro de usuarios auténticos vía Google OAuth.
                    </p>
                  </div>
                  <SupabaseConfigPanel
                    config={supabaseConfig}
                    onSaveConfig={handleSaveSupabaseConfig}
                    onResetConfig={handleResetSupabaseConfig}
                    activeUser={activeUser}
                    onSwitchUser={handleSwitchUser}
                    allUsers={users}
                    onAddCustomUser={handleAddCustomUser}
                  />
                </div>

              </div>
            )}

            {/* VIEW: PERSONAL CONTRIBUTIONS DASHBOARD */}
            {activeTab === 'contributions' && (
              <MyContributionsView
                contributions={contributions}
                projects={projects}
                components={components}
                activeUser={activeUser}
                allUsers={users}
                onSwitchUser={handleSwitchUser}
                onUploadPaymentTicket={handleUploadPaymentTicket}
                onOpenCoupon={setActiveCoupon}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 mt-12 py-8 text-xs text-slate-400 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-bold text-slate-500">
            <button 
              onClick={() => setActiveLegalTab('terms')} 
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Términos y Condiciones
            </button>
            <span className="text-slate-200 hidden sm:inline">•</span>
            <button 
              onClick={() => setActiveLegalTab('privacy')} 
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Políticas de Privacidad
            </button>
            <span className="text-slate-200 hidden sm:inline">•</span>
            <button 
              onClick={() => setActiveLegalTab('refunds')} 
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Reembolsos y Cancelaciones
            </button>
            <span className="text-slate-200 hidden sm:inline">•</span>
            <button 
              onClick={() => setActiveLegalTab('consumer')} 
              className="hover:text-blue-600 text-red-600 transition cursor-pointer flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Botón de Arrepentimiento
            </button>
            <span className="text-slate-200 hidden sm:inline">•</span>
            <button 
              onClick={() => setActiveLegalTab('faq')} 
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Soporte & FAQ
            </button>
          </div>
          
          <div className="border-t border-slate-50 pt-4 space-y-1">
            <p className="font-medium text-slate-500">© 2026 VaquitaApp. Diseñado para Administradores, Owners y Backers.</p>
            <p className="font-mono text-[10px] text-slate-400">Desarrollo Web & Mobile adaptivo con soporte de persistencia local y Supabase SQL.</p>
          </div>
        </div>
      </footer>

      {/* Core Payment Coupon Drawer Modal */}
      <CouponModal
        contribution={activeCoupon}
        projects={projects}
        onClose={() => setActiveCoupon(null)}
      />

      {/* Special Thank You Poster Modal */}
      {specialThankYou && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-amber-200 text-center relative overflow-hidden flex flex-col items-center">
            {/* Elegant Background Accents */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-200 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-300 rounded-full blur-3xl opacity-40"></div>
            
            {/* Award/Star Icon with animation */}
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg mb-6 ring-8 ring-amber-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.173-.435.766-.435.94 0l2.09 5.2 5.56.494c.475.042.665.627.31.954l-4.17 3.965 1.15 5.5c.1.474-.413.847-.827.58l-4.76-2.92-4.76 2.92c-.414.267-.927-.106-.827-.58l1.15-5.5-4.17-3.965c-.355-.327-.165-.912.31-.954l5.56-.494 2.09-5.2Z" />
              </svg>
            </div>

            <h3 className="font-extrabold text-amber-900 text-2xl tracking-tight mb-2 uppercase">
              ¡Reconocimiento Especial!
            </h3>
            
            <p className="text-xs font-semibold text-amber-800 mb-6 font-serif italic">
              "La grandeza de una comunidad se mide por la generosidad de sus aportantes"
            </p>
            
            <div className="bg-white/85 backdrop-blur-xs border border-amber-200/55 rounded-2xl p-5 w-full mb-6 space-y-3 shadow-xs">
              <p className="text-slate-700 text-xs leading-relaxed">
                ¡Muchísimas gracias, <strong className="text-amber-700 text-sm font-black">{specialThankYou.backerName}</strong>! Tu extraordinario aporte de <strong className="text-emerald-700 text-sm font-bold font-mono">${specialThankYou.amount.toLocaleString('es-AR')}</strong> representa un <strong className="text-amber-700 text-sm font-extrabold font-mono">{specialThankYou.percent}%</strong> de la meta para el recurso indispensable:
              </p>
              <div className="py-2.5 px-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Insumo Reclamado</p>
                <p className="text-xs font-extrabold text-amber-900">{specialThankYou.componentName}</p>
                <p className="text-[10px] text-amber-700/80 font-medium mt-0.5">En el Proyecto: {specialThankYou.projectName}</p>
              </div>
            </div>

            <p className="text-xs text-amber-700 font-medium leading-relaxed max-w-sm mb-6">
              Tu compromiso acelera de manera sustancial la finalización de este proyecto y la concreción de los objetivos comunes de nuestra comunidad.
            </p>

            <button
              onClick={() => {
                setSpecialThankYou(null);
                showAlert('success', `Aporte reservado. Por favor realiza la transferencia bancaria y carga tu comprobante desde la pestaña "Mis Aportes" para recibir la validación.`);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              Entendido y Copiar Cupón
            </button>
          </div>
        </div>
      )}

      {/* Legal & Support Hub Modal Overlay */}
      <LegalViews
        isOpen={activeLegalTab !== null}
        initialTab={activeLegalTab || 'terms'}
        onClose={() => setActiveLegalTab(null)}
        contributions={contributions}
        projects={projects}
        components={components}
        activeUser={activeUser}
        onRevokeContribution={handleRevokeContribution}
      />

      {/* Edit Project Modal Overlay */}
      {editingProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-slide-up">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600 animate-spin-slow" />
                  Configurar y Modificar Proyecto: <span className="text-blue-700 font-mono font-bold">{editingProject.id}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Modifique los campos necesarios para actualizar los datos generales y la grilla de requerimientos.
                </p>
              </div>
              <button 
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer text-xs p-1 hover:bg-slate-100 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleSaveEditProject} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* General Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Remodelación de Vestuarios"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Categoría
                  </label>
                  <select
                    value={editProjectCategory}
                    onChange={(e) => setEditProjectCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white cursor-pointer font-medium"
                  >
                    <option value="construction">Infraestructura</option>
                    <option value="party">Fiestas / Cervezas</option>
                    <option value="event">Eventos</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Descripción del Proyecto
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Escriba los detalles y objetivos de este proyecto..."
                    value={editProjectDesc}
                    onChange={(e) => setEditProjectDesc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white leading-normal"
                  />
                </div>
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    Fecha de Inicio de Campaña
                    {editingProject.is_approved && (
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase font-black tracking-wider font-sans">Vigente</span>
                    )}
                  </label>
                  <input
                    type="date"
                    required
                    value={editProjectStartDate}
                    onChange={(e) => setEditProjectStartDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight">La fecha de inicio de campaña se puede modificar (debe ser mayor o igual a la fecha actual).</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Fecha de Fin de Campaña
                  </label>
                  <input
                    type="date"
                    required
                    min={editProjectStartDate}
                    value={editProjectEndDate}
                    onChange={(e) => setEditProjectEndDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Transfer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-150 rounded-2xl p-4 bg-amber-50/30">
                <div className="md:col-span-2">
                  <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Coordenadas de Transferencia (CBU / Alias)
                  </h4>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Alias de Pago
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CLUB.URQUIZA.MP"
                    value={editProjectAlias}
                    onChange={(e) => setEditProjectAlias(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    CBU o CVU (22 dígitos)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0000003100012345678901"
                    value={editProjectCbu}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setEditProjectCbu(value.substring(0, 22));
                    }}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Image and Banner Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-slate-100 rounded-2xl bg-slate-50/30">
                {/* Avatar / Imagen */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Imagen / Avatar del Proyecto (URL)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: https://images.unsplash.com/..."
                    value={editProjectAvatarUrl}
                    onChange={(e) => setEditProjectAvatarUrl(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Presets rápidos:</span>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {[
                        { name: 'Obras', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&auto=format&fit=crop&q=80' },
                        { name: 'Fiesta', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=150&auto=format&fit=crop&q=80' },
                        { name: 'Asado', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&auto=format&fit=crop&q=80' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setEditProjectAvatarUrl(preset.url)}
                          className="px-2 py-1 text-[9px] bg-white hover:bg-slate-50 rounded-md font-semibold transition text-slate-600 border border-slate-200 cursor-pointer shrink-0"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Banner / Propaganda */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Banner de Campaña o Evento (URL)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: https://images.unsplash.com/..."
                    value={editProjectBannerUrl}
                    onChange={(e) => setEditProjectBannerUrl(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Presets rápidos:</span>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {[
                        { name: 'Obras', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200&h=400' },
                        { name: 'Fiesta', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200&h=400' },
                        { name: 'Show', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200&h=400' }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setEditProjectBannerUrl(preset.url)}
                          className="px-2 py-1 text-[9px] bg-white hover:bg-slate-50 rounded-md font-semibold transition text-slate-600 border border-slate-200 cursor-pointer shrink-0"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documento Adjunto del Proyecto (PDF o Imagen) */}
              <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/30 space-y-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Documento Adjunto (Opcional - PDF o Imagen)
                </label>
                <p className="text-[11px] text-slate-500">
                  Cargue un archivo PDF o imagen descriptiva que detalle el propósito, planos o presupuestos del proyecto.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <span>Seleccionar Archivo</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 3 * 1024 * 1024) {
                            showAlert('error', 'El archivo no debe superar los 3 MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setEditProjectDocumentUrl(evt.target?.result as string);
                            setEditProjectDocumentName(file.name);
                            showAlert('success', `Archivo "${file.name}" cargado con éxito.`);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {editProjectDocumentName ? (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
                      <span className="truncate max-w-[200px]">{editProjectDocumentName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditProjectDocumentUrl('');
                          setEditProjectDocumentName('');
                        }}
                        className="text-emerald-600 hover:text-emerald-900 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Ningún archivo seleccionado</span>
                  )}
                </div>
              </div>

              {/* Reel de Fotos del Proyecto (Máximo 8) */}
              <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/30 space-y-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Reel de Fotos del Proyecto (Hasta 8 imágenes)
                </label>
                <p className="text-[11px] text-slate-500">
                  Agregue fotos que estén relacionadas con la obra, evento o terreno del proyecto.
                </p>
                
                <div className="space-y-3">
                  <label className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer text-xs font-bold text-slate-700 flex inline-flex items-center gap-1.5 shadow-2xs">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 47.86 0 0 0-3.472 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                    <span>Agregar Foto ({editProjectPhotoReel.length}/8)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={editProjectPhotoReel.length >= 8}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        if (editProjectPhotoReel.length + files.length > 8) {
                          showAlert('error', 'Solo puede cargar un máximo de 8 fotos en el reel.');
                          return;
                        }
                        
                        files.forEach((file) => {
                          if (file.size > 800 * 1024) {
                            showAlert('error', `La foto "${file.name}" supera los 800KB. Utilice una imagen de menor peso.`);
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const resStr = evt.target?.result as string;
                            setEditProjectPhotoReel((prev) => [...prev, resStr]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                  </label>

                  {editProjectPhotoReel.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      {editProjectPhotoReel.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                          <img src={img} className="w-full h-full object-cover" alt="Reel image" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => {
                              setEditProjectPhotoReel((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute inset-0 bg-red-600/70 text-white font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px]"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Supplies/Requirements Grid */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                      Grilla de Requerimientos e Insumos
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Defina los insumos o servicios que el proyecto necesita. Las columnas son editables en tiempo real.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditProjectComponentsGrid([
                          ...editProjectComponentsGrid,
                          { name: '', quantity: 1, price: 1000 }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Agregar Ítem</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editProjectComponentsGrid.length > 1) {
                          setEditProjectComponentsGrid(editProjectComponentsGrid.slice(0, -1));
                        } else {
                          showAlert('error', 'Debe haber al menos un requerimiento.');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      Remover Último
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 bg-slate-50 font-extrabold uppercase text-[9px] tracking-wider text-slate-400">
                        <th className="py-2.5 px-3 w-[45%]">DESCRIPCIÓN / INSUMO / SERVICIO</th>
                        <th className="py-2.5 px-3 w-[15%] text-right">CANTIDAD</th>
                        <th className="py-2.5 px-3 w-[15%] text-right">PRECIO UNITARIO ($)</th>
                        <th className="py-2.5 px-3 w-[15%] text-center">UMBRAL AGRADEC. (%)</th>
                        <th className="py-2.5 px-3 text-right">TOTAL ($)</th>
                        <th className="py-2.5 px-3 text-center">ELIMINAR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editProjectComponentsGrid.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Ej. Bolsones de Arena, Bolsa de Cemento"
                              value={item.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...editProjectComponentsGrid];
                                updated[index].name = val;
                                setEditProjectComponentsGrid(updated);
                              }}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 0);
                                const updated = [...editProjectComponentsGrid];
                                updated[index].quantity = val;
                                setEditProjectComponentsGrid(updated);
                              }}
                              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 font-mono text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.price}
                              onChange={(e) => {
                                const val = Math.max(1, parseFloat(e.target.value) || 0);
                                const updated = [...editProjectComponentsGrid];
                                updated[index].price = val;
                                setEditProjectComponentsGrid(updated);
                              }}
                              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 font-mono text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              required
                              min="1"
                              max="100"
                              value={item.thank_you_threshold_percent || 50}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 50));
                                const updated = [...editProjectComponentsGrid];
                                updated[index].thank_you_threshold_percent = val;
                                setEditProjectComponentsGrid(updated);
                              }}
                              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 font-mono text-center font-semibold"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-slate-700 font-mono pr-4 shrink-0 whitespace-nowrap">
                            ${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-AR')}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (editProjectComponentsGrid.length > 1) {
                                  const updated = editProjectComponentsGrid.filter((_, i) => i !== index);
                                  setEditProjectComponentsGrid(updated);
                                } else {
                                  showAlert('error', 'Debe ingresar al menos un insumo o requerimiento.');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar fila"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Summary row */}
                  <div className="bg-slate-50 p-3 flex justify-between items-center border-t border-slate-150 font-extrabold text-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-extrabold">Monto Total Estimado Modificado:</span>
                    <span className="text-sm font-black text-blue-700 font-mono">
                      ${editProjectComponentsGrid.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>

              {editProjectError && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 border border-red-100 rounded-xl">
                  {editProjectError}
                </p>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="text-slate-500 hover:bg-slate-100 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Guardar Modificaciones
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
