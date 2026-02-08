'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types pour l'état global
export interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  technologies: string[];
  status: 'completed' | 'in-progress' | 'planned';
  category: string;
  url?: string;
  github?: string;
  createdAt: Date;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  features: string[];
  duration: string;
  popular?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface AppState {
  projects: Project[];
  services: Service[];
  user: User | null;
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  language: 'fr' | 'en';
}

// Actions pour le reducer
export type AppAction =
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_SERVICES'; payload: Service[] }
  | { type: 'ADD_SERVICE'; payload: Service }
  | { type: 'UPDATE_SERVICE'; payload: { id: string; updates: Partial<Service> } }
  | { type: 'DELETE_SERVICE'; payload: string }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; payload: 'fr' | 'en' }
  | { type: 'CLEAR_ERROR' };

// État initial
const initialState: AppState = {
  projects: [],
  services: [],
  user: null,
  loading: false,
  error: null,
  theme: 'light',
  language: 'fr',
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id
            ? { ...project, ...action.payload.updates }
            : project
        ),
      };
    
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
      };
    
    case 'SET_SERVICES':
      return { ...state, services: action.payload };
    
    case 'ADD_SERVICE':
      return { ...state, services: [...state.services, action.payload] };
    
    case 'UPDATE_SERVICE':
      return {
        ...state,
        services: state.services.map(service =>
          service.id === action.payload.id
            ? { ...service, ...action.payload.updates }
            : service
        ),
      };
    
    case 'DELETE_SERVICE':
      return {
        ...state,
        services: state.services.filter(service => service.id !== action.payload),
      };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Hooks spécialisés pour différentes parties de l'état
export function useProjects() {
  const { state, dispatch } = useAppContext();
  
  const addProject = (project: Project) => {
    dispatch({ type: 'ADD_PROJECT', payload: project });
  };
  
  const updateProject = (id: string, updates: Partial<Project>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
  };
  
  const deleteProject = (id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  };
  
  const setProjects = (projects: Project[]) => {
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  };
  
  return {
    projects: state.projects,
    addProject,
    updateProject,
    deleteProject,
    setProjects,
  };
}

export function useServices() {
  const { state, dispatch } = useAppContext();
  
  const addService = (service: Service) => {
    dispatch({ type: 'ADD_SERVICE', payload: service });
  };
  
  const updateService = (id: string, updates: Partial<Service>) => {
    dispatch({ type: 'UPDATE_SERVICE', payload: { id, updates } });
  };
  
  const deleteService = (id: string) => {
    dispatch({ type: 'DELETE_SERVICE', payload: id });
  };
  
  const setServices = (services: Service[]) => {
    dispatch({ type: 'SET_SERVICES', payload: services });
  };
  
  return {
    services: state.services,
    addService,
    updateService,
    deleteService,
    setServices,
  };
}

export function useTheme() {
  const { state, dispatch } = useAppContext();
  
  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
    localStorage.setItem('theme', theme);
  };
  
  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };
  
  return {
    theme: state.theme,
    setTheme,
    toggleTheme,
  };
}

export function useLanguage() {
  const { state, dispatch } = useAppContext();
  
  const setLanguage = (language: 'fr' | 'en') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
    localStorage.setItem('language', language);
  };
  
  return {
    language: state.language,
    setLanguage,
  };
}