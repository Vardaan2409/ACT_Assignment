import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, LayoutDashboard, Compass } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center space-x-6">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">MERN Platform</span>
        </Link>

        {user && (
          <div className="hidden sm:flex items-center space-x-4 border-l border-gray-200 pl-6">
            <Link
              to="/dashboard"
              className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/explore"
              className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors flex items-center space-x-1"
            >
              <Compass className="w-4 h-4 text-slate-500" />
              <span>Map Discovery</span>
            </Link>
          </div>
        )}
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
