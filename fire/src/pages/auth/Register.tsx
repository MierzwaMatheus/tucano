import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleRedirect = () => {
    toast({
      title: "Redirecionando",
      description: "Você será redirecionado para o login com Google",
    });
    navigate('/login');
  };
  
  return (
    <AuthLayout 
      title="Cadastre-se" 
      subtitle="Para criar sua conta, use o login com Google"
    >
      <div className="space-y-4">
        <p className="text-center text-muted-foreground">
          O Tucano utiliza autenticação com Google para garantir maior segurança e praticidade.
          Clique no botão abaixo para ser redirecionado ao login.
        </p>
        
        <Button 
          type="button" 
          className="w-full" 
          onClick={handleRedirect}
          size="lg"
        >
          Ir para o Login
        </Button>
      </div>
    </AuthLayout>
  );
};

export default Register;
