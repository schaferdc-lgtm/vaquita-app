import { Project, ProjectComponent, UserProfile } from './types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'de708761-0f6d-4952-b88a-360e224e7be0',
    email: 'schaferdc@gmail.com',
    full_name: 'Daniel Schafer (Admin)',
    role: 'admin',
  },
  {
    id: 'e482701b-c741-4e0d-b8d9-2f2dbf77c3a0',
    email: 'creador@proyecto.com',
    full_name: 'Santiago Soler (Project Owner)',
    role: 'owner',
  },
  {
    id: 'a5cb58f6-5e58-47fb-94db-99e2e604f877',
    email: 'aportante@gmail.com',
    full_name: 'Maria Luz (Backer)',
    role: 'backer',
  }
];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_COMPONENTS: ProjectComponent[] = [];

