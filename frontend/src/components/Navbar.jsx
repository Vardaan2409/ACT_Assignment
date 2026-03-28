import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
      <div className="flex items-center space-x-2">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">MERN Dashboard</span>
      </div>
      
      <div className="flex items-center space-x-4">
        {user && (
          <>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
