import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, onValue, remove, query, orderByChild } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Mock data
const initialLists = [
  {
    id: '1',
    name: 'Lista do mês',
    month: 'Maio',
    year: '2025',
    budget: 500,
    spent: 320,
    items: 15,
    isCompleted: false,
  },
  {
    id: '2',
    name: 'Feira semanal',
    month: 'Maio',
    year: '2025',
    budget: 200,
    spent: 185,
    items: 8,
    isCompleted: false,
  },
  {
    id: '3',
    name: 'Produtos de limpeza',
    month: 'Abril',
    year: '2025',
    budget: 150,
    spent: 120,
    items: 12,
    isCompleted: true,
  },
];

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface ShoppingListData {
  name: string;
  month: string;
  year: string;
  budget: number;
  spent: number;
  items: number;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ShoppingList extends ShoppingListData {
  id: string;
}

interface NewListFormData {
  name: string;
  month: string;
  year: string;
  budget: string;
}

const formatCurrency = (value: string): string => {
  // Remove non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  // Convert to a number in cents
  const cents = parseInt(digitsOnly || '0', 10);
  
  // Convert to reais format
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Função para validar e normalizar os dados da lista
const normalizeListData = (id: string, data: any): ShoppingList => {
  return {
    id,
    name: data.name || '',
    month: data.month || '',
    year: data.year || '',
    budget: Number(data.budget) || 0,
    spent: Number(data.spent) || 0,
    items: Number(data.items) || 0,
    isCompleted: Boolean(data.isCompleted),
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now()
  };
};

const ShoppingLists = () => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<NewListFormData>({
    name: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    budget: '',
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar listas do Firebase
  useEffect(() => {
    if (!user) return;

    const listsRef = ref(database, `shopping-lists/${user.uid}`);
    const listsQuery = query(listsRef, orderByChild('createdAt'));

    const unsubscribe = onValue(listsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const listsArray = Object.entries(data)
          .map(([id, listData]) => normalizeListData(id, listData))
          .filter(list => list.name && list.budget > 0); // Filtra listas inválidas
        setLists(listsArray.reverse());
      } else {
        setLists([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'budget') {
      setFormData((prev) => ({
        ...prev,
        [name]: formatCurrency(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleEditClick = (list: ShoppingList) => {
    setIsEditMode(true);
    setEditingId(list.id);
    setFormData({
      name: list.name,
      month: list.month,
      year: list.year,
      budget: list.budget.toFixed(2),
    });
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.budget) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor preencha o nome da lista e o orçamento",
        variant: "destructive",
      });
      return;
    }
    
    // Convert formatted price to number
    const budgetStr = formData.budget.replace(/\D/g, '');
    const budget = parseInt(budgetStr, 10) / 100;
    
    if (isNaN(budget) || budget <= 0) {
      toast({
        title: "Orçamento inválido",
        description: "Por favor digite um valor válido para o orçamento",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const timestamp = Date.now();
      const listData: ShoppingListData = {
        name: formData.name.trim(),
        month: formData.month,
        year: formData.year,
        budget,
        spent: 0,
        items: 0,
        isCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (isEditMode && editingId) {
        // Atualizar lista existente
        const listRef = ref(database, `shopping-lists/${user?.uid}/${editingId}`);
        await set(listRef, {
          ...listData,
          updatedAt: timestamp
        });

        toast({
          title: "Lista atualizada",
          description: "Lista de compras atualizada com sucesso!",
        });
      } else {
        // Criar nova lista
        const newListId = Date.now().toString();
        const newListRef = ref(database, `shopping-lists/${user?.uid}/${newListId}`);
        await set(newListRef, listData);

        toast({
          title: "Lista criada",
          description: "Nova lista de compras adicionada com sucesso!",
        });
      }
      
      // Reset form and close dialog
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setFormData({
        name: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear().toString(),
        budget: '',
      });
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a lista. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista?')) return;

    try {
      const listRef = ref(database, `shopping-lists/${user?.uid}/${id}`);
      await remove(listRef);
      
      toast({
        title: "Lista removida",
        description: "A lista foi removida com sucesso",
      });
    } catch (error) {
      console.error('Erro ao remover lista:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover a lista. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenList = (id: string) => {
    navigate(`/shopping/${id}`);
  };
  
  const activeLists = lists.filter(list => !list.isCompleted);
  const completedLists = lists.filter(list => list.isCompleted);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Suas listas de compras</h2>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="hidden md:flex">
                <Plus className="mr-2 h-4 w-4" />
                Nova Lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? 'Editar lista de compras' : 'Criar nova lista de compras'}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? 'Atualize os detalhes da sua lista de compras' 
                    : 'Defina os detalhes da sua nova lista de compras'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da lista</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Supermercado Mensal"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Mês</Label>
                    <Select
                      value={formData.month}
                      onValueChange={(value) => handleSelectChange("month", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="year">Ano</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => handleSelectChange("year", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento (R$)</Label>
                  <Input
                    id="budget"
                    name="budget"
                    placeholder="0,00"
                    value={formData.budget}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : isEditMode ? 'Atualizar Lista' : 'Criar Lista'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Listas Ativas</h3>
          
          <div className="grid gap-4">
            {activeLists.map((list) => (
              <Card key={list.id} className="card-hover cursor-pointer" onClick={() => handleOpenList(list.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">
                        {list.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {list.month} · {list.year}
                      </p>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(list);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(list.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Orçamento: R$ {list.budget.toFixed(2)}</span>
                      <span className="font-medium">
                        R$ {list.spent.toFixed(2)} ({Math.round((list.spent / list.budget) * 100)}%)
                      </span>
                    </div>
                    
                    <Progress 
                      value={(list.spent / list.budget) * 100} 
                      className="h-2"
                    />
                    
                    <div className="flex justify-between text-sm pt-1">
                      <span>Restante: R$ {(list.budget - list.spent).toFixed(2)}</span>
                      <span>{list.items} itens</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {activeLists.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Você ainda não tem listas de compras ativas.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira lista
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {completedLists.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Listas Concluídas</h3>
            
            <div className="grid gap-4">
              {completedLists.map((list) => (
                <Card key={list.id} className="card-hover bg-muted/30 cursor-pointer" onClick={() => handleOpenList(list.id)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">
                          {list.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {list.month} · {list.year}
                        </p>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(list);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(list.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Orçamento: R$ {list.budget.toFixed(2)}</span>
                        <span className="font-medium">
                          R$ {list.spent.toFixed(2)} ({Math.round((list.spent / list.budget) * 100)}%)
                        </span>
                      </div>
                      
                      <Progress 
                        value={100} 
                        className={`h-2 ${
                          list.spent <= list.budget ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      
                      <div className="flex justify-between text-sm pt-1">
                        <span className={
                          list.spent <= list.budget ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }>
                          {list.spent <= list.budget 
                            ? `Economizado: R$ ${(list.budget - list.spent).toFixed(2)}`
                            : `Ultrapassado: R$ ${(list.spent - list.budget).toFixed(2)}`
                          }
                        </span>
                        <span>{list.items} itens</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Botão flutuante para mobile */}
      <div className="fixed right-6 bottom-24 md:bottom-8 z-10 md:hidden">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => {
            setIsEditMode(false);
            setFormData({
              name: '',
              month: new Date().toLocaleString('default', { month: 'long' }),
              year: new Date().getFullYear().toString(),
              budget: '',
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </MainLayout>
  );
};

export default ShoppingLists;
