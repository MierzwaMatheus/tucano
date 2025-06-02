
import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowDownUp, BarChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-6 py-6">
        <div className="text-center max-w-md mx-auto mb-8">
          <h1 className="text-3xl font-bold font-bitter mb-3">
            Bem-vindo ao <span className="text-primary">Tucano</span>
          </h1>
          <p className="text-muted-foreground">
            Organize suas listas de compras e finanças de forma simples e eficiente
          </p>
        </div>

        <div className="grid gap-6">
          <Link to="/shopping-lists">
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
                  Listas de Compras
                </CardTitle>
                <CardDescription>
                  Organize seus itens e economize nas compras
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p>Crie e gerencie listas de compras, acompanhando seu orçamento e gastos em tempo real.</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  Ver listas de compras
                </Button>
              </CardFooter>
            </Card>
          </Link>

          <Link to="/transactions">
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <ArrowDownUp className="mr-2 h-5 w-5 text-primary" />
                  Balanços Financeiros
                </CardTitle>
                <CardDescription>
                  Acompanhe receitas e despesas
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p>Registre suas transações financeiras e mantenha o controle das suas finanças pessoais.</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  Ver balanços
                </Button>
              </CardFooter>
            </Card>
          </Link>

          <Link to="/dashboard">
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5 text-primary" />
                  Dashboard
                </CardTitle>
                <CardDescription>
                  Visualize dados e estatísticas
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p>Acesse gráficos e resumos para entender melhor seus hábitos de consumo e finanças.</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  Ver dashboard
                </Button>
              </CardFooter>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
