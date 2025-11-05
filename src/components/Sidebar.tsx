import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Users,
  UserPlus,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContextObject';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  section?: string;
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard',
      section: 'MENU',
    },
    {
      id: 'projects',
      label: 'Projetos',
      icon: <Film className="w-5 h-5" />,
      path: '/projects',
      section: 'MENU',
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: <Building2 className="w-5 h-5" />,
      path: '/clients',
      section: 'GESTÃO',
    },
    {
      id: 'users',
      label: 'Usuários',
      icon: <Users className="w-5 h-5" />,
      path: '/users',
      section: 'GESTÃO',
    },
    {
      id: 'new-user',
      label: 'Novo Usuário',
      icon: <UserPlus className="w-5 h-5" />,
      path: '/users/new',
      section: 'GESTÃO',
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const groupedItems = menuItems.reduce(
    (acc, item) => {
      const section = item.section || 'OUTROS';
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  // Fecha o drawer quando mudar de rota (mobile)
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Fecha o drawer ao clicar fora (mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        isDrawerOpen &&
        !target.closest('.drawer-sidebar') &&
        !target.closest('.drawer-button')
      ) {
        setIsDrawerOpen(false);
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDrawerOpen]);

  return (
    <>
      {/* Drawer Button (Mobile) */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="drawer-button fixed top-4 left-4 z-40 lg:hidden bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2.5 rounded-lg shadow-lg hover:opacity-90 transition"
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay (Mobile) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Sidebar/Drawer */}
      <aside
        className={`drawer-sidebar ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col h-screen
        
        ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:sticky top-0 z-50 lg:z-auto
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h1
              className={`font-bold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
              }`}
            >
              GERROT
            </h1>

            {/* Close button (mobile) ou Collapse button (desktop) */}
            <button
              onClick={() => {
                // Mobile: fecha drawer
                if (window.innerWidth < 1024) {
                  setIsDrawerOpen(false);
                } else {
                  // Desktop: toggle collapse
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            >
              <span className="lg:hidden">
                <X className="w-5 h-5" />
              </span>
              <span className="hidden lg:block">
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="mb-4">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-slate-400 px-3 mb-2 mt-4 first:mt-0">
                  {section}
                </h3>
              )}
              {items.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition group ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border-l-4 border-indigo-500'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span
                    className={`${
                      isActive(item.path) ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`font-medium transition-all duration-300 ${
                      isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer - Logout */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition w-full group"
            title={isCollapsed ? 'Sair' : ''}
          >
            <LogOut className="w-5 h-5" />
            <span
              className={`font-medium transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              Sair
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
