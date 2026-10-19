import { useContext } from 'react';
import { DashboardContext } from './DashboardContext';

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
  return context;
};
