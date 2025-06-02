import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, set, onValue, update, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import FilterableSelect from '@/components/ui/filterable-select';
import { Plus, Edit, Trash2, Search, Import } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';

// Unidades de medida
const units = [
  'un', // unidade
  'kg', // quilograma
  'g',  // grama
  'l',  // litro
  'ml', // mililitro
  'cx', // caixa
  'pct' // pacote
];

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  brand: string;
  price: number;
  category: string;
  isPurchased: boolean;
}

interface ShoppingList {
  id: string;
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

interface ItemFormData {
  name: string;
  quantity: string;
  unit: string;
  brand: string;
  price: string;
  category: string;
}

interface ImportableList {
  id: string;
  name: string;
  items: ShoppingListItem[];
}

interface ImportableItem extends ShoppingListItem {
  checked: boolean;
}

const formatCurrency = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  const cents = parseInt(digitsOnly || '0', 10);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ShoppingListDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    quantity: '1',
    unit: 'un',
    brand: '',
    price: '',
    category: '',
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [importableLists, setImportableLists] = useState<ImportableList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ImportableItem[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Carregar lista e itens do Firebase
  useEffect(() => {
    if (!user || !id) return;

    const listRef = ref(database, `shopping-lists/${user.uid}/${id}`);
    const itemsRef = ref(database, `shopping-lists/${user.uid}/${id}/items`);

    const unsubscribeList = onValue(listRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setList({
          id,
          ...data
        });
      }
    });

    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const itemsArray = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          ...item
        }));
        setItems(itemsArray);
      } else {
        setItems([]);
      }
    });

    return () => {
      unsubscribeList();
      unsubscribeItems();
    };
  }, [user, id]);

  // Atualizar gastos e status da lista
  useEffect(() => {
    if (!list || !user || !id) return;

    const totalSpent = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const allItemsPurchased = items.length > 0 && items.every(item => item.isPurchased);

    // Só atualiza se houver mudança real nos valores
    if (totalSpent !== list.spent || allItemsPurchased !== list.isCompleted) {
      const updates: any = {
        spent: totalSpent,
        isCompleted: allItemsPurchased,
        updatedAt: Date.now()
      };

      const listRef = ref(database, `shopping-lists/${user.uid}/${id}`);
      update(listRef, updates);
    }
  }, [items, list, user, id]);

  // Carregar listas importáveis
  useEffect(() => {
    if (!user) return;

    const listsRef = ref(database, `shopping-lists/${user.uid}`);

    const unsubscribe = onValue(listsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lists = Object.entries(data)
          .filter(([listId]) => listId !== id) // Exclui a lista atual
          .map(([listId, listData]: [string, any]) => ({
            id: listId,
            name: listData.name,
            items: Object.entries(listData.items || {}).map(([itemId, item]: [string, any]) => ({
              id: itemId,
              ...item
            }))
          }));
        setImportableLists(lists);
      } else {
        setImportableLists([]);
      }
    });

    return () => unsubscribe();
  }, [user, id]);

  // Buscar categorias de compras do Firebase
  useEffect(() => {
    if (!user) return;
    const catRef = ref(database, `categories/${user.uid}/shopping`);
    const unsubscribe = onValue(catRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.values(data).map((cat: any) => cat.name);
        setCategories(loaded);
      } else {
        setCategories([]);
      }
    });
    return () => unsubscribe();
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor preencha o nome e o preço do item",
        variant: "destructive",
      });
      return;
    }
    
    // Convert formatted price to number
    const priceStr = formData.price.replace(/\D/g, '');
    const price = parseInt(priceStr, 10) / 100;
    
    if (isNaN(price) || price < 0) {
      toast({
        title: "Preço inválido",
        description: "Por favor digite um valor válido para o preço",
        variant: "destructive",
      });
      return;
    }
    
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Por favor digite uma quantidade válida maior que zero",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const itemData = {
        name: formData.name.trim(),
            quantity,
        unit: formData.unit,
        brand: formData.brand.trim(),
            price,
        category: formData.category,
        isPurchased: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (editingItemId) {
        // Atualizar item existente
        const itemRef = ref(database, `shopping-lists/${user?.uid}/${id}/items/${editingItemId}`);
        await set(itemRef, {
          ...itemData,
          updatedAt: Date.now()
        });
      
      toast({
        title: "Item atualizado",
        description: "O item foi atualizado com sucesso!",
      });
    } else {
        // Criar novo item
        const newItemId = Date.now().toString();
        const newItemRef = ref(database, `shopping-lists/${user?.uid}/${id}/items/${newItemId}`);
        await set(newItemRef, itemData);
      
      toast({
        title: "Item adicionado",
        description: "O item foi adicionado à lista com sucesso!",
      });
    }
    
    setIsDialogOpen(false);
    setEditingItemId(null);
    setFormData({
      name: '',
      quantity: '1',
        unit: 'un',
      brand: '',
      price: '',
        category: '',
      });
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o item. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePurchase = async (itemId: string) => {
    try {
      const itemRef = ref(database, `shopping-lists/${user?.uid}/${id}/items/${itemId}`);
      const item = items.find(i => i.id === itemId);

      if (item) {
        await set(itemRef, {
          ...item,
          isPurchased: !item.isPurchased,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o item. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setConfirmDelete({ open: true, itemId });
  };

  const confirmDeleteItem = async () => {
    if (!confirmDelete.itemId) return;
    setIsDeleting(true);
    try {
      const itemRef = ref(database, `shopping-lists/${user?.uid}/${id}/items/${confirmDelete.itemId}`);
      await set(itemRef, null);
    toast({
      title: "Item removido",
      description: "O item foi removido da lista",
    });
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover o item. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete({ open: false, itemId: null });
    }
  };

  const handleEditClick = (item: ShoppingListItem) => {
    setEditingItemId(item.id);
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      brand: item.brand,
      price: item.price.toFixed(2),
      category: item.category,
    });
    setIsDialogOpen(true);
  };

  // Ordenar os itens por categoria antes de filtrar
  const sortedItems = [...items].sort((a, b) =>
    a.category.localeCompare(b.category, 'pt-BR', { sensitivity: 'base' })
  );

  const filteredItems = sortedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? item.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  const unpurchasedItems = filteredItems.filter(item => !item.isPurchased);
  const purchasedItems = filteredItems.filter(item => item.isPurchased);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (selectedListId) {
      const list = importableLists.find(list => list.id === selectedListId);
      if (list) {
        setSelectedItems(list.items.map(item => ({ ...item, checked })));
      }
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newItems = prev.map(item =>
          item.id === itemId ? { ...item, checked } : item
        );
        
      // Atualiza o estado de "selecionar todos"
      const allChecked = newItems.every(item => item.checked);
      setSelectAll(allChecked);

      return newItems;
    });
  };

  const handleImportItems = async () => {
    if (!selectedListId || !user || !id) return;

    const itemsToImport = selectedItems.filter(item => item.checked);
    if (itemsToImport.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Por favor selecione pelo menos um item para importar",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);

    try {
      const itemsRef = ref(database, `shopping-lists/${user.uid}/${id}/items`);
      const currentItems = await get(itemsRef);
      const currentItemsData = currentItems.val() || {};

      // Adiciona os itens importados mantendo os IDs originais
      const updates: any = {};
      itemsToImport.forEach(item => {
        updates[item.id] = {
      ...item,
          isPurchased: false, // Marca como não comprado
          updatedAt: Date.now()
        };
      });

      await update(itemsRef, updates);
    
    toast({
      title: "Itens importados",
        description: `${itemsToImport.length} itens foram importados com sucesso!`,
    });
    
    setIsImportDialogOpen(false);
    setSelectedListId(null);
    setSelectedItems([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Erro ao importar itens:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao importar os itens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Atualiza os itens selecionados quando muda a lista
  useEffect(() => {
    if (selectedListId) {
      const list = importableLists.find(list => list.id === selectedListId);
      if (list) {
        setSelectedItems(list.items.map(item => ({ ...item, checked: false })));
        setSelectAll(false);
      }
    } else {
      setSelectedItems([]);
      setSelectAll(false);
    }
  }, [selectedListId, importableLists]);

  if (!list) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title={list.name} showBackButton={true}>
      <div className="space-y-6">
        {/* Budget Card */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Orçamento</span>
              <span className="font-semibold">R$ {list.budget.toFixed(2)}</span>
            </div>
            
            <Progress 
              value={(list.spent / list.budget) * 100} 
              className="h-2"
            />
            
            <div className="flex justify-between text-sm font-medium">
              <span>
                Gasto: R$ {list.spent.toFixed(2)} ({Math.round((list.spent / list.budget) * 100)}%)
              </span>
              <span className={list.spent <= list.budget ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {list.spent <= list.budget 
                  ? `Restante: R$ ${(list.budget - list.spent).toFixed(2)}` 
                  : `Ultrapassado: R$ ${(list.spent - list.budget).toFixed(2)}`}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item ou marca"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <FilterableSelect
            options={categories}
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="Filtrar por categoria"
            className="w-full"
          />

          {/* Import button */}
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Import className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Itens</span>
          </Button>
        </div>
        
        {/* Items List */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">
              Itens para comprar ({unpurchasedItems.length})
            </h3>
            
            {unpurchasedItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum item disponível para comprar
              </p>
            ) : (
              <div className="space-y-2">
                {unpurchasedItems.map(item => (
                  <Card key={item.id} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`check-${item.id}`}
                          checked={item.isPurchased}
                          onCheckedChange={() => handleTogglePurchase(item.id)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium leading-none">
                                {item.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.quantity} {item.unit} · {item.brand}
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-medium text-lg">
                                R$ {(item.price * item.quantity).toFixed(2)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                R$ {item.price.toFixed(2)} / {item.unit}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="outline" className="bg-secondary">
                              {item.category}
                            </Badge>
                            
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditClick(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {purchasedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center">
                <Separator className="flex-1" />
                <span className="mx-4 text-sm text-muted-foreground">
                  Itens comprados ({purchasedItems.length})
                </span>
                <Separator className="flex-1" />
              </div>
              
              <div className="space-y-2">
                {purchasedItems.map(item => (
                  <Card key={item.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`check-${item.id}`}
                          checked={item.isPurchased}
                          onCheckedChange={() => handleTogglePurchase(item.id)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium leading-none">
                                {item.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.quantity} {item.unit} · {item.brand}
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-medium text-lg">
                                R$ {(item.price * item.quantity).toFixed(2)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                R$ {item.price.toFixed(2)} / {item.unit}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="outline" className="bg-secondary">
                              {item.category}
                            </Badge>
                            
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add/Edit Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? 'Editar item' : 'Adicionar novo item'}</DialogTitle>
            <DialogDescription>
              {editingItemId 
                ? 'Atualize os detalhes do item'
                : 'Preencha os detalhes do item que deseja adicionar à lista'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do item</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Arroz"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <FilterableSelect
                  options={units}
                  value={formData.unit}
                  onChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                  placeholder="Selecione a unidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  onKeyDown={(e) => {
                    // Permite apenas números, vírgula e teclas de controle
                    if (!/[\d,.,Backspace,Delete,ArrowLeft,ArrowRight]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    // Limita a 4 casas decimais
                    const value = e.target.value;
                    if (value.includes('.')) {
                      const [int, dec] = value.split('.');
                      if (dec && dec.length > 4) {
                        e.target.value = `${int}.${dec.slice(0, 4)}`;
                      }
                    }
                    handleChange(e);
                  }}
                  value={formData.quantity}
                  disabled={isLoading}
                />
              </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Preço unitário (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  placeholder="0,00"
                  value={formData.price}
                  onChange={handleChange}
                disabled={isLoading}
                />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                name="brand"
                placeholder="Ex: Camil"
                value={formData.brand}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <FilterableSelect
                options={categories}
                value={formData.category}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                placeholder="Selecione uma categoria"
              />
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : editingItemId ? 'Atualizar Item' : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Import Items Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar itens de outra lista</DialogTitle>
            <DialogDescription>
              Selecione uma lista e os itens que deseja importar. Os itens serão marcados como não comprados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="listSelect">Selecione uma lista</Label>
              <FilterableSelect
                options={importableLists.map(list => list.name)}
                value={selectedListId ? importableLists.find(list => list.id === selectedListId)?.name || '' : ''}
                onChange={(value) => {
                  const list = importableLists.find(list => list.name === value);
                  setSelectedListId(list?.id || null);
                }}
                placeholder="Escolha uma lista para importar"
              />
            </div>
            
            {selectedListId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Itens disponíveis para importar</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-all"
                      checked={selectAll}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                    <Label htmlFor="select-all" className="text-sm">Selecionar todos</Label>
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                  {selectedItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-2">
                      Não há itens disponíveis para importar
                    </p>
                  ) : (
                    selectedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`item-${item.id}`}
                            checked={item.checked}
                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                          />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} · {item.brand} · R$ {item.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setSelectedListId(null);
                setSelectedItems([]);
                setSelectAll(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportItems}
              disabled={!selectedListId || isImporting || !selectedItems.some(item => item.checked)}
            >
              {isImporting ? 'Importando...' : 'Importar Itens Selecionados'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Floating action button */}
      <div className="fixed right-6 bottom-24 md:bottom-8 z-10">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => {
            setEditingItemId(null);
            setFormData({
              name: '',
              quantity: '1',
              unit: 'un',
              brand: '',
              price: '',
              category: '',
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* ConfirmDialog para exclusão de item */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Remover item"
        description="Tem certeza que deseja remover este item da lista?"
        confirmText="Remover"
        cancelText="Cancelar"
        loading={isDeleting}
        onConfirm={confirmDeleteItem}
        onCancel={() => setConfirmDelete({ open: false, itemId: null })}
      />
    </MainLayout>
  );
};

export default ShoppingListDetail;
