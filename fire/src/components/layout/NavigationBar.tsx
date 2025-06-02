import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, ArrowDownUp, BarChart, Settings, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const NavigationBar = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t pb-safe md:relative md:pb-0 md:border-t-0 md:border-r md:w-72 md:min-h-screen md:bg-background">
      <div className="hidden md:flex items-center p-4">
        <h1 className="text-xl font-bold font-bitter">
          <span className="text-primary">Tucano</span>
        </h1>
      </div>
      
      <div className="hidden md:block">
        <div className="h-[1px] bg-border mx-3 my-2"></div>
      </div>
      
      <div className="flex justify-around md:flex-col md:space-y-1 md:p-2">
        <NavLink 
          to="/shopping" 
          className={({isActive}) => cn(
            "flex h-14 w-14 md:h-10 md:w-auto items-center justify-center md:justify-start rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <ShoppingCart className="h-5 w-5 md:mr-2" />
          <span className="text-[10px] mt-1 md:mt-0 md:text-sm md:block block absolute bottom-1 md:static md:bottom-auto">Compras</span>
        </NavLink>
        
        <NavLink 
          to="/finance/transactions" 
          className={({isActive}) => cn(
            "flex h-14 w-14 md:h-10 md:w-auto items-center justify-center md:justify-start rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <ArrowDownUp className="h-5 w-5 md:mr-2" />
          <span className="text-[10px] mt-1 md:mt-0 md:text-sm md:block block absolute bottom-1 md:static md:bottom-auto">Balanços</span>
        </NavLink>
        
        <NavLink 
          to="/finance/card" 
          className={({isActive}) => cn(
            "flex h-14 w-14 md:h-10 md:w-auto items-center justify-center md:justify-start rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <CreditCard className="h-5 w-5 md:mr-2" />
          <span className="text-[10px] mt-1 md:mt-0 md:text-sm md:block block absolute bottom-1 md:static md:bottom-auto">Cartão</span>
        </NavLink>
        
        <NavLink 
          to="/finance/dashboard" 
          className={({isActive}) => cn(
            "flex h-14 w-14 md:h-10 md:w-auto items-center justify-center md:justify-start rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <BarChart className="h-5 w-5 md:mr-2" />
          <span className="text-[10px] mt-1 md:mt-0 md:text-sm md:block block absolute bottom-1 md:static md:bottom-auto">Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/settings" 
          className={({isActive}) => cn(
            "flex h-14 w-14 md:h-10 md:w-auto items-center justify-center md:justify-start rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <Settings className="h-5 w-5 md:mr-2" />
          <span className="text-[10px] mt-1 md:mt-0 md:text-sm md:block block absolute bottom-1 md:static md:bottom-auto">Config.</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default NavigationBar;
