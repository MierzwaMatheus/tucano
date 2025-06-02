import React from 'react';
import Header from './Header';
import NavigationBar from './NavigationBar';
import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title,
  showBackButton
}) => {
  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard');

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <NavigationBar />
      
      <div className="flex-1">
        <Header title={title} showBackButton={showBackButton} />
        
        <main
          className={
            `container px-4 pb-20 md:pb-8 pt-4 animate-fade-in` +
            (isDashboard ? '' : ' max-w-3xl')
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
