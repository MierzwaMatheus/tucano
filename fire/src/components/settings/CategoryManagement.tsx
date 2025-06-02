import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Save } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type Category = {
  id: string;
  name: string;
  type: 'shopping' | 'expense' | 'income';
};

type CategoryManagementProps = {
  type: 'shopping' | 'expense' | 'income';
};

// Categorias padrão
const defaultCategories: Record<string, { name: string; type: 'shopping' | 'expense' | 'income' }[]> = {
  income: [
    { name: 'Salário', type: 'income' },
    { name: 'Benefícios', type: 'income' },
    { name: 'Freelas', type: 'income' },
    { name: 'Presentes', type: 'income' },
    { name: 'Investimentos', type: 'income' },
  ],
  expense: [
    { name: 'Aluguel', type: 'expense' },
    { name: 'Condomínio', type: 'expense' },
    { name: 'Contas', type: 'expense' },
    { name: 'Mercado', type: 'expense' },
    { name: 'Delivery', type: 'expense' },
    { name: 'Restaurantes', type: 'expense' },
    { name: 'Transporte', type: 'expense' },
    { name: 'Pets', type: 'expense' },
    { name: 'Cigarros', type: 'expense' },
    { name: 'Bebidas', type: 'expense' },
    { name: 'Roupas', type: 'expense' },
    { name: 'Saúde', type: 'expense' },
    { name: 'Educação', type: 'expense' },
    { name: 'Lazer', type: 'expense' },
    { name: 'Cartão', type: 'expense' },
    { name: 'Empréstimos', type: 'expense' },
    { name: 'Doações', type: 'expense' },
    { name: 'Presentes', type: 'expense' },
  ],
};

const CategoryManagement: React.FC<CategoryManagementProps> = ({ type }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Carregar categorias do Firebase
  useEffect(() => {
    if (!user) return;
    const catRef = ref(database, `categories/${user.uid}/${type}`);
    const unsubscribe = onValue(catRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.entries(data).map(([id, cat]: [string, any]) => ({
          id,
          name: cat.name,
          type: cat.type,
        }));
        setCategories(loaded);
      } else {
        // Se não houver categorias, insere as padrão
        const defaults = defaultCategories[type] || [];
        const updates: Record<string, Category> = {};
        defaults.forEach(cat => {
          const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
          updates[newId] = { id: newId, ...cat };
        });
        if (defaults.length > 0) {
          await set(catRef, updates);
          setCategories(Object.values(updates));
        } else {
          setCategories([]);
        }
      }
    });
    return () => unsubscribe();
  }, [user, type]);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const newId = Date.now().toString();
    const newCategoryItem: Category = {
      id: newId,
      name: newCategory.trim(),
      type: type,
    };
    await set(ref(database, `categories/${user.uid}/${type}/${newId}`), newCategoryItem);
    setNewCategory("");
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory({ ...category });
  };

  const handleSaveEdit = async () => {
    if (editingCategory && editingCategory.name.trim() && user) {
      await update(ref(database, `categories/${user.uid}/${type}/${editingCategory.id}`), {
        name: editingCategory.name.trim(),
      });
      setEditingCategory(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete && user) {
      await remove(ref(database, `categories/${user.uid}/${type}/${categoryToDelete}`));
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const filteredCategories = categories;

  return (
    <div className="space-y-4">
      {/* Add new category */}
      <div className="flex items-end space-x-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="new-category">Nova categoria</Label>
          <Input
            id="new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nome da categoria"
          />
        </div>
        <Button onClick={handleAddCategory} className="mb-0.5">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* List categories */}
      <div className="border rounded-md max-h-[60vh] overflow-y-auto">
        {filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma categoria encontrada
          </div>
        ) : (
          <ul className="divide-y">
            {filteredCategories.map(category => (
              <li key={category.id} className="p-3 flex justify-between items-center">
                {editingCategory && editingCategory.id === category.id ? (
                  <div className="flex items-center space-x-2 flex-1">
                    <Input
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="flex-1"
                    />
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>{category.name}</span>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditClick(category)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(category.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogFooter className="mt-4">
        <Button type="submit">Salvar Alterações</Button>
      </DialogFooter>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Esta categoria será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryManagement;
