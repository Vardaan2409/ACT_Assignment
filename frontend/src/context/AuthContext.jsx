import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/api/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (name, email, password, phone) => {
    try {
      const { data } = await API.post('/api/auth/register', { name, email, password, phone });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  // ─── OTP helpers ─────────────────────────────────────────────────────────

  /**
   * Send OTP to a phone number
   * @param {string} phone - Raw phone number (10 digits or E.164)
   * @param {string} purpose - 'login' | 'signup' | 'phone_verify'
   * @returns {{ success, expiresIn, dev_otp, message }}
   */
  const sendOtp = async (phone, purpose = 'phone_verify') => {
    try {
      const { data } = await API.post('/api/otp/send', { phone, purpose });
      return { success: true, ...data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
      };
    }
  };

  /**
   * Verify OTP submitted by user
   * @param {string} phone
   * @param {string} otp - 6-digit code
   * @param {string} purpose
   * @returns {{ success, verified, token?, user?, message }}
   */
  const verifyOtp = async (phone, otp, purpose = 'phone_verify') => {
    try {
      const { data } = await API.post('/api/otp/verify', { phone, otp, purpose });
      // If backend returns a JWT (login purpose), persist it
      if (data.token && data.user) {
        const userData = { ...data.user, token: data.token };
        setUser(userData);
        localStorage.setItem('userInfo', JSON.stringify(userData));
      }
      return { success: true, ...data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'OTP verification failed',
        attemptsRemaining: error.response?.data?.attemptsRemaining,
        expired: error.response?.data?.expired || false,
      };
    }
  };

  /**
   * Resend OTP (calls same /send endpoint; server-side rate limiter controls abuse)
   */
  const resendOtp = async (phone, purpose = 'phone_verify') => {
    return sendOtp(phone, purpose);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, sendOtp, verifyOtp, resendOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
};
