
import React from 'react';
import { ThemeToggle } from '../ThemeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title,
  subtitle
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center">
            <h1 className="text-3xl font-bold font-bitter tracking-tight">
              <span className="text-primary">Tucano</span>
            </h1>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
