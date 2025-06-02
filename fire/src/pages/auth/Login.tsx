import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      await signInWithGoogle();
      toast({
        title: "Login realizado",
        description: "Você foi autenticado com sucesso",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Não foi possível realizar o login com o Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthLayout 
      title="Login" 
      subtitle="Entre com sua conta Google para acessar"
    >
      <div className="space-y-4">
        <Button 
          type="button" 
          className="w-full" 
            disabled={isLoading}
          onClick={handleGoogleLogin}
          variant="outline"
          size="lg"
        >
          <FcGoogle className="mr-2 h-5 w-5" />
          {isLoading ? "Processando..." : "Entrar com Google"}
        </Button>
        
        <div className="text-center pt-2">
          <p className="text-sm text-muted-foreground">
            Ao continuar, você concorda com nossos{" "}
            <a href="/terms" className="text-primary hover:underline">
              Termos de Uso
            </a>
            {" "}e{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
