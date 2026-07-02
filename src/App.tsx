import React, { useState, useEffect } from 'react';
import { 
  Project, ProjectComponent, Contribution, UserProfile, 
  SupabaseConfig, ProjectCategory, UserAction 
} from './types';
import { 
  INITIAL_USERS, INITIAL_PROJECTS, INITIAL_COMPONENTS 
} from './data';
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

export default function App() {
  // --- DATABASE STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  
  // --- AUTH STATE ---
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);

  // --- SUPABASE STATE ---
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    anonKey: '',
    isConnected: false,
  });

  // --- UI NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contributions' | 'admin' | 'settings'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLegalTab, setActiveLegalTab] = useState<'terms' | 'privacy' | 'refunds' | 'consumer' | 'faq' | null>(null);
  
  // --- FILTER & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');

  // --- MODALS & NOTIFICATIONS ---
  const [activeCoupon, setActiveCoupon] = useState<Contribution | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- PROJECT CREATION FORM STATE ---
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<ProjectCategory>('construction');
  const [newProjectComponentsInput, setNewProjectComponentsInput] = useState<string>(
    '100 Bolsones de Arena, Precio: 50000\n20 Bolsa de Cemento, Precio: 30000\n20 Bolsa de Cal, Precio: 40000\n3500 Ladrillos, Precio: 150'
  );
  const [createProjectError, setCreateProjectError] = useState('');
  const [newProjectAvatarUrl, setNewProjectAvatarUrl] = useState('');
  const [newProjectAlias, setNewProjectAlias] = useState('');
  const [newProjectCbu, setNewProjectCbu] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [newProjectStartDate, setNewProjectStartDate] = useState('2026-06-01');
  const [newProjectEndDate, setNewProjectEndDate] = useState('2026-12-31');

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
        const adminUser = INITIAL_USERS.find(u => u.email === 'schaferdc@gmail.com') || INITIAL_USERS[0];
        setActiveUser(adminUser);
        localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(adminUser));
      }
    } else {
      // DEFAULT: Log in Daniel Schafer (Admin) so the client immediately reviews the pristine admin dashboard and features
      const adminUser = INITIAL_USERS.find(u => u.email === 'schaferdc@gmail.com') || INITIAL_USERS[0];
      setActiveUser(adminUser);
      localStorage.setItem(LS_ACTIVE_USER, JSON.stringify(adminUser));
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

    // Hydrate User Actions
    const localUserActions = localStorage.getItem(LS_USER_ACTIONS);
    if (localUserActions) {
      setUserActions(JSON.parse(localUserActions));
    } else {
      setUserActions([]);
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

  // Sync state modifications to local storage
  const syncToLocalStorage = (
    updatedProjects: Project[],
    updatedComponents: ProjectComponent[],
    updatedContributions: Contribution[]
  ) => {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(updatedProjects));
    localStorage.setItem(LS_COMPONENTS, JSON.stringify(updatedComponents));
    localStorage.setItem(LS_CONTRIBUTIONS, JSON.stringify(updatedContributions));
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

  const handleLogout = () => {
    if (activeUser) {
      logUserAction(activeUser.email, 'CERRAR_SESION', `Cerró la sesión de usuario`);
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
  const handleSaveSupabaseConfig = (url: string, key: string) => {
    const newConfig: SupabaseConfig = {
      url,
      anonKey: key,
      isConnected: url.length > 0 && key.length > 0,
    };
    setSupabaseConfig(newConfig);
    localStorage.setItem(LS_CONFIG, JSON.stringify(newConfig));
    if (newConfig.isConnected) {
      showAlert('success', '¡Conectado exitosamente al cliente de Supabase!');
    } else {
      showAlert('success', 'Desconectado de Supabase. Corriendo en persistencia local.');
    }
  };

  const handleResetSupabaseConfig = () => {
    const defaultCfg = { url: '', anonKey: '', isConnected: false };
    setSupabaseConfig(defaultCfg);
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
    showAlert('success', `Aporte reservado. Por favor realiza la transferencia bancaria y carga tu comprobante desde la pestaña "Mis Aportes" para recibir la validación.`);
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

    // Parse components input
    // Format expected: Quantity Name, Precio: UnitPrice
    // e.g.: 100 Bolsones de Arena, Precio: 50000
    const lines = newProjectComponentsInput.split('\n').filter(l => l.trim().length > 0);
    const parsedComponents: ProjectComponent[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(/^(\d+)\s+([^,]+),\s*(?:Precio|price|precio|Price)\s*:\s*(\d+(\.\d+)?)$/i);
      
      if (!match) {
        setCreateProjectError(`Error de formato en la línea ${i + 1}: "${line}". Debe ser: "Cantidad Nombre, Precio: Valor"`);
        return;
      }

      const qty = parseInt(match[1]);
      const name = match[2].trim();
      const price = parseFloat(match[3]);

      if (qty <= 0 || price <= 0) {
        setCreateProjectError(`La cantidad y el precio en la línea ${i + 1} deben ser mayores a cero.`);
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
      });
    }

    if (parsedComponents.length === 0) {
      setCreateProjectError('Debe ingresar al menos un insumo o requerimiento.');
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

    // Build Project Object
    const newProject: Project = {
      id: sanitizedId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      category: newProjectCategory,
      owner_id: activeUser?.id || 'user-owner-1',
      created_at: new Date().toISOString(),
      avatar_url: newProjectAvatarUrl || undefined,
      payment_alias: newProjectAlias.trim() || undefined,
      payment_cbu: newProjectCbu.trim() || undefined,
      start_date: newProjectStartDate,
      end_date: newProjectEndDate,
      is_deleted: false,
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
    setNewProjectAlias('');
    setNewProjectCbu('');
    setNewProjectComponentsInput('100 Bolsones de Arena, Precio: 50000\n20 Bolsa de Cemento, Precio: 30000');
    setNewProjectStartDate('2026-06-01');
    setNewProjectEndDate('2026-12-31');
    setShowCreateProjectForm(false);
    showAlert('success', `Proyecto "${newProject.name}" creado con ID: ${sanitizedId}`);
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

  // Update Project End Date (Owner or Admin)
  const handleUpdateProjectEndDate = (projectId: string, newEndDate: string) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, end_date: newEndDate };
      }
      return p;
    });
    setProjects(updated);
    syncToLocalStorage(updated, components, contributions);
    
    if (activeUser) {
      logUserAction(
        activeUser.email,
        'MODIFICACION_VIGENCIA',
        `Modificó la fecha fin del proyecto ${projectId} a ${newEndDate}`
      );
    }
    showAlert('success', 'La fecha de finalización se ha actualizado correctamente.');
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
                className={`px-3 py-1.5 rounded-lg transition relative ${
                  activeTab === 'admin'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Panel de Admin
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </button>
            )}
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
          </nav>

          {/* Active User Google Auth UI */}
          <div className="flex items-center gap-3">
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
                onClick={() => setActiveTab('settings')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-full shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acceder con Google</span>
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
            onUpdateProjectEndDate={handleUpdateProjectEndDate}
            onSoftDeleteProject={handleSoftDeleteProject}
            onRestoreProject={handleRestoreProject}
          />
        ) : (
          <>
            {/* VIEW: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                
                {/* Aggregate Progression Panel (Main Hero) */}
                <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-7 space-y-4">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                      Progreso Global Comunitario
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
                      onClick={() => setShowCreateProjectForm(!showCreateProjectForm)}
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
                            onChange={(e) => setNewProjectStartDate(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Fecha de Fin
                          </label>
                          <input
                            type="date"
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

                      {/* Itemized list of components generator */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Lista de Requerimientos e Insumos (Un componente por línea)
                          </label>
                          <span className="text-[9px] text-slate-400">Format: "Cantidad Nombre, Precio: Valor"</span>
                        </div>
                        <textarea
                          rows={4}
                          value={newProjectComponentsInput}
                          onChange={(e) => setNewProjectComponentsInput(e.target.value)}
                          placeholder="100 Bolsas de Arena, Precio: 50000&#10;20 Bolsa de Cemento, Precio: 30000"
                          className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-slate-50"
                        />
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
                      />
                    ))
                  )}
                </div>

              </div>
            )}

            {/* VIEW: ADMIN CONSOLE (schaferdc@gmail.com) */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Admin Header Stats */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-500" /> Consola de Administración (Daniel Schafer)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Supervisión absoluta de proyectos de construcción, fiestas, y la gestión de cupones emitidos.</p>
                  </div>
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

            {/* VIEW: SETTINGS & SUPABASE CONNECTIVITY */}
            {activeTab === 'settings' && (
              <SupabaseConfigPanel
                config={supabaseConfig}
                onSaveConfig={handleSaveSupabaseConfig}
                onResetConfig={handleResetSupabaseConfig}
                activeUser={activeUser}
                onSwitchUser={handleSwitchUser}
                allUsers={users}
                onAddCustomUser={handleAddCustomUser}
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

    </div>
  );
}
