
import React from 'react';
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md animate-fade-in">
        <h1 className="text-4xl font-bold font-bitter mb-2">Página não encontrada</h1>
        <div className="text-9xl font-bold text-primary mb-4">404</div>
        <p className="text-xl text-muted-foreground mb-8">
          A página <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">{location.pathname}</span> não existe.
        </p>
        
        <Link to="/">
          <Button>
            <Home className="mr-2 h-4 w-4" />
            Voltar para o início
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
