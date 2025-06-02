import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import FilterableSelect from '@/components/ui/filterable-select';

interface Transaction {
  id: string;
  name: string;
  description?: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  categoryId: string;
  isPaid: boolean;
  includeInStats: boolean;
  isRecurring?: boolean;
  recurringEndDate?: string;
  purchaseDate?: string;
  totalAmount?: number;
  installments?: number;
  isSubscription?: boolean;
}

const Credit: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (now.getDate() > 12) {
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    return `${year}-${month.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!user) return;
    const transRef = ref(database, `transactions/${user.uid}`);
    const unsub = onValue(transRef, (snap) => {
      const data = snap.val();
      if (data) {
        const loaded: Transaction[] = Object.entries(data)
          .map(([id, t]: [string, any]) => ({ id, ...t }))
          .filter(t => !!t.purchaseDate);
        setTransactions(loaded);
      } else {
        setTransactions([]);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const catRef = ref(database, `categories/${user.uid}/expense`);
    const unsub = onValue(catRef, (snap) => {
      const data = snap.val();
      if (data) {
        const loaded = Object.entries(data).map(([id, cat]: [string, any]) => ({ id, name: cat.name }));
        setCategories(loaded);
      } else {
        setCategories([]);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (transactions.length === 0) return;
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        monthsSet.add(value);
      }
    });
    const monthsArr = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!monthsArr.includes(filterMonth)) {
      setFilterMonth(monthsArr[0] || currentMonth);
    }
  }, [transactions]);

  // Filtro por mês
  const filteredByMonth = transactions.filter(t => t.date.startsWith(filterMonth));
  // Filtro por categoria
  const filteredByCategory = filterCategory === 'Todas'
    ? filteredByMonth
    : filteredByMonth.filter(t => t.categoryId === filterCategory);
  // Filtro por busca
  const filtered = filteredByCategory.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Ordenar por data de compra (mais recente primeiro)
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.purchaseDate || a.date).getTime();
    const dateB = new Date(b.purchaseDate || b.date).getTime();
    return dateB - dateA;
  });

  // Total gasto no mês
  const totalCredit = filteredByMonth.reduce((sum, t) => sum + Number(t.amount), 0);

  // Gerar opções de meses
  const generateMonthOptions = () => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        monthsSet.add(value);
      }
    });
    const monthsArr = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    return monthsArr.map(value => {
      const [year, month] = value.split('-');
      const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('pt-BR', { month: 'long' });
      return { value, label: `${monthName} ${year}` };
    });
  };

  return (
    <MainLayout title="Cartão de Crédito">
      <div className="space-y-6">
        {/* Card topo */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
              {filterCategory === 'Todas' 
                ? 'Total gasto no crédito' 
                : `Total gasto em ${filterCategory}`}
            </span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              R$ {filterCategory === 'Todas' 
                ? totalCredit.toFixed(2)
                : filteredByCategory.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)}
            </span>
          </CardContent>
        </Card>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar compra"
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <FilterableSelect
            options={['Todas', ...categories.map(cat => cat.name)]}
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="Filtrar por categoria"
            className="w-full"
          />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de compras no crédito */}
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma compra encontrada.</p>
            </div>
          ) : (
            sorted.map(transaction => (
              <Card key={transaction.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium leading-none flex items-center gap-1">
                            {transaction.name}
                            {transaction.isSubscription && (
                              <Badge variant="secondary" className="text-xs">Assinatura</Badge>
                            )}
                          </h4>
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground mt-1 max-w-[320px] truncate" title={transaction.description}>
                              {transaction.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-lg text-red-600 dark:text-red-400">
                            -R$ {Number(transaction.amount).toFixed(2)}
                          </div>
                          {transaction.totalAmount && (
                            <p className="text-xs text-muted-foreground">
                              Total: R$ {Number(transaction.totalAmount).toFixed(2)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Compra: {transaction.purchaseDate ? (() => {
                              const [y, m, d] = transaction.purchaseDate.split('-');
                              return `${d}/${m}/${y}`;
                            })() : '-'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pagamento: {transaction.date ? (() => {
                              const [y, m, d] = transaction.date.split('-');
                              return `${d}/${m}/${y}`;
                            })() : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline" className="bg-secondary">
                          {transaction.categoryId || 'Sem categoria'}
                        </Badge>
                        {transaction.installments && transaction.installments > 1 && (
                          <span className="text-xs text-muted-foreground">
                            {`Parcela ${(() => {
                              if (!transaction.purchaseDate) return '-';
                              const [payY, payM] = transaction.date.split('-').map(Number);
                              const [purY, purM] = transaction.purchaseDate.split('-').map(Number);
                              let diff = (payY - purY) * 12 + (payM - purM);
                              if (diff >= transaction.installments) diff = transaction.installments;
                              if (diff < 1) diff = 1;
                              return `${diff}/${transaction.installments}`;
                            })()}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Credit;
