import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { PieChart, BarChart, Repeat } from 'lucide-react';
import { ArrowUpCircle, ArrowDownCircle, Plus, Edit, Trash2, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import FilterableSelect from '@/components/ui/filterable-select';
import { v4 as uuidv4 } from 'uuid';
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle, DialogFooter as ConfirmDialogFooter } from '@/components/ui/dialog';
import { Dialog as SimpleDialog, DialogContent as SimpleDialogContent, DialogHeader as SimpleDialogHeader, DialogTitle as SimpleDialogTitle, DialogFooter as SimpleDialogFooter } from '@/components/ui/dialog';

// Mock data
const categories = [
  { id: '1', name: 'Alimentação', type: 'expense' },
  { id: '2', name: 'Transporte', type: 'expense' },
  { id: '3', name: 'Moradia', type: 'expense' },
  { id: '4', name: 'Lazer', type: 'expense' },
  { id: '5', name: 'Saúde', type: 'expense' },
  { id: '6', name: 'Salário', type: 'income' },
  { id: '7', name: 'Freelance', type: 'income' },
  { id: '8', name: 'Investimentos', type: 'income' },
];

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
  recurrenceId?: string;
  purchaseDate?: string;
}

interface TransactionFormData {
  name: string;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  categoryId: string;
  isPaid: boolean;
  includeInStats: boolean;
  isRecurring: boolean;
  recurringEndDate?: string;
}

const initialTransactions: Transaction[] = [
  {
    id: '1',
    name: 'Salário',
    amount: 5000,
    date: '2025-05-05',
    type: 'income',
    categoryId: '6',
    isPaid: true,
    includeInStats: true,
  },
  {
    id: '2',
    name: 'Aluguel',
    description: 'Apartamento',
    amount: 1200,
    date: '2025-05-10',
    type: 'expense',
    categoryId: '3',
    isPaid: true,
    includeInStats: true,
  },
  {
    id: '3',
    name: 'Supermercado',
    amount: 350.75,
    date: '2025-05-12',
    type: 'expense',
    categoryId: '1',
    isPaid: false,
    includeInStats: true,
  },
  {
    id: '4',
    name: 'Freelance Design',
    description: 'Projeto de interface',
    amount: 1200,
    date: '2025-05-15',
    type: 'income',
    categoryId: '7',
    isPaid: true,
    includeInStats: true,
  },
  {
    id: '5',
    name: 'Internet',
    amount: 120,
    date: '2025-05-20',
    type: 'expense',
    categoryId: '3',
    isPaid: false,
    includeInStats: true,
  },
];

// Format currency with automatic mask
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

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (() => {
      const now = new Date();
      let month = now.getMonth() + 1;
      if (now.getDate() > 14) {
        month++;
        if (month > 12) {
          month = 1;
          return `${now.getFullYear() + 1}-01`;
        }
      }
      return `${now.getFullYear()}-${month.toString().padStart(2, '0')}`;
    })()
  );
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  const [formData, setFormData] = useState<TransactionFormData>({
    name: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    categoryId: '',
    isPaid: false,
    includeInStats: true,
    isRecurring: false,
    recurringEndDate: undefined,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<{ id: string; name: string; type: 'expense' | 'income' }[]>([]);

  const [confirmRecurring, setConfirmRecurring] = useState<{
    open: boolean;
    action: 'edit' | 'delete' | null;
    transaction: Transaction | null;
    updatedData?: Partial<Transaction>;
  }>({ open: false, action: null, transaction: null });
  const [recurringOption, setRecurringOption] = useState<'single' | 'future' | 'all'>('single');
  const [editFormTemp, setEditFormTemp] = useState<{ transaction: Transaction | null, updatedData: Partial<Transaction> | null }>({ transaction: null, updatedData: null });

  // Adicionar estados para crédito
  const [isCredit, setIsCredit] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isSubscription, setIsSubscription] = useState(false);

  // Estado para dialog de marcar todas as compras do crédito como pagas
  const [confirmCreditPaid, setConfirmCreditPaid] = useState<{ open: boolean, transaction: Transaction | null }>({ open: false, transaction: null });

  // Defina a função de filtro antes dos cálculos dos cards
  const getFilteredByDate = () => {
    const today = new Date();
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      switch (filterPeriod) {
        case 'day':
          return transaction.date === selectedDate;
        case 'week': {
          const dayOfWeek = today.getDay();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - dayOfWeek);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return transactionDate >= weekStart && transactionDate <= weekEnd;
        }
        case 'month': {
          const [year, month] = selectedMonth.split('-');
          return (
            transactionDate.getFullYear() === parseInt(year) &&
            transactionDate.getMonth() === parseInt(month) - 1
          );
        }
        case 'year':
          return transactionDate.getFullYear() === parseInt(selectedYear);
        default:
          return true;
      }
    });
  };

  // Cards de resumo devem considerar apenas transações do período selecionado
  const filteredByDate = getFilteredByDate();
  const totalIncome = filteredByDate
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = filteredByDate
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const balance = totalIncome - totalExpenses;
  
  const pendingExpenses = filteredByDate
    .filter(t => t.type === 'expense' && !t.isPaid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Carregar transações do Firebase
  useEffect(() => {
    if (!user) return;
    const transRef = ref(database, `transactions/${user.uid}`);
    const unsubscribe = onValue(transRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded: Transaction[] = Object.entries(data).map(([id, t]: [string, any]) => ({ id, ...t }));
        console.log('[DEBUG] Transações carregadas do banco:', loaded);
        setTransactions(loaded);
      } else {
        setTransactions([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Buscar categorias do Firebase
  useEffect(() => {
    if (!user) return;
    const catRef = ref(database, `categories/${user.uid}`);
    const unsubscribe = onValue(catRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded: { id: string; name: string; type: 'expense' | 'income' }[] = [];
        Object.entries(data).forEach(([type, cats]: [string, any]) => {
          Object.entries(cats || {}).forEach(([id, cat]: [string, any]) => {
            loaded.push({ id, name: cat.name, type: cat.type });
          });
        });
        setCategories(loaded);
      } else {
        setCategories([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Verificar e criar instância de recorrência ao entrar em novo mês
  useEffect(() => {
    if (!user || !transactions.length) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    // Filtrar recorrências sem data fim
    const recurrences = transactions.filter(t => t.isRecurring && !t.recurringEndDate && t.recurrenceId);
    recurrences.forEach(rec => {
      // Para assinaturas no crédito, garantir sempre 12 futuras
      if (rec.isSubscription && rec.purchaseDate) {
        // Descobrir o dia do pagamento (do cartão)
        let paymentDay = 10;
        try {
          const snap = window.localStorage.getItem('creditCardSettings');
          if (snap) {
            const data = JSON.parse(snap);
            paymentDay = Number(data.paymentDay) || 10;
          }
        } catch { }
        // Descobrir quantas futuras já existem
        const future = transactions.filter(t => t.recurrenceId === rec.recurrenceId && t.date >= currentMonth);
        let lastDate = future.length > 0 ? future.map(t => t.date).sort().pop() : rec.date;
        let [lastYear, lastMonth] = lastDate.split('-').map(Number);
        let toCreate = 12 - future.length;
        for (let i = 0; i < toCreate; i++) {
          lastMonth++;
          if (lastMonth > 12) { lastMonth = 1; lastYear++; }
          const payDate = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
          const exists = transactions.some(t => t.recurrenceId === rec.recurrenceId && t.date === payDate);
          if (!exists) {
            const newT = { ...rec, id: `credit-${payDate}-${Math.random().toString(36).substr(2, 9)}`, date: payDate };
            if (newT.recurringEndDate === undefined) delete newT.recurringEndDate;
            if (newT.recurrenceId === undefined) delete newT.recurrenceId;
            saveTransaction(newT);
          }
        }
      } else {
        // Recorrência normal (não assinatura crédito)
        const future = transactions.filter(t => t.recurrenceId === rec.recurrenceId && t.date >= currentMonth);
        let lastDate = future.length > 0 ? future.map(t => t.date).sort().pop() : rec.date;
        let [lastYear, lastMonth, lastDay] = lastDate.split('-').map(Number);
        let toCreate = 12 - future.length;
        for (let i = 0; i < toCreate; i++) {
          lastMonth++;
          if (lastMonth > 12) { lastMonth = 1; lastYear++; }
          const date = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          const exists = transactions.some(t => t.recurrenceId === rec.recurrenceId && t.date === date);
          if (!exists) {
            const newT = { ...rec, id: `${rec.type}-${date}-${Math.random().toString(36).substr(2, 9)}`, date };
            if (newT.recurringEndDate === undefined) delete newT.recurringEndDate;
            if (newT.recurrenceId === undefined) delete newT.recurrenceId;
            saveTransaction(newT);
          }
        }
      }
    });
  }, [user, transactions]);

  // Salvar/editar transação no Firebase
  const saveTransaction = async (transaction: Transaction) => {
    if (!user) return;
    await set(ref(database, `transactions/${user.uid}/${transaction.id}`), transaction);
  };

  // Remover transação do Firebase
  const deleteTransaction = async (id: string) => {
    if (!user) return;
    await remove(ref(database, `transactions/${user.uid}/${id}`));
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
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

  const handleEditClick = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormData({
      name: transaction.name,
      description: transaction.description || '',
      amount: transaction.amount.toFixed(2),
      date: transaction.date,
      type: transaction.type,
      categoryId: transaction.categoryId,
      isPaid: transaction.isPaid,
      includeInStats: transaction.includeInStats,
      isRecurring: transaction.isRecurring,
      recurringEndDate: transaction.recurringEndDate,
    });
    // Resetar opção de recorrência ao abrir modal de edição
    setRecurringOption('single');
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Debug dos campos
    console.log({
      name: formData.name,
      totalAmount,
      purchaseDate,
      categoryId: formData.categoryId,
      isCredit
    });
    if (
      !formData.name.trim() ||
      (isCredit ? !totalAmount || totalAmount === '0,00' : !formData.amount || formData.amount === '0,00') ||
      (isCredit ? !purchaseDate : !formData.date) ||
      !formData.categoryId ||
      formData.categoryId === 'Todas'
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    if (isCredit) {
      // Lógica de cartão de crédito
      // Buscar config do cartão
      const userId = user?.uid;
      let closingDay = 6, paymentDay = 10;
      try {
        const snap = await import('firebase/database').then(({ get, ref }) => get(ref(database, `creditCardSettings/${userId}`)));
        const data = snap?.val();
        if (data) {
          closingDay = Number(data.closingDay) || 6;
          paymentDay = Number(data.paymentDay) || 10;
        }
      } catch { }
      // Parse valores
      const total = parseFloat(totalAmount.replace(/\D/g, '')) / 100;
      if (isNaN(total) || total <= 0) {
        toast({ title: 'Valor inválido', description: 'Digite um valor válido', variant: 'destructive' });
        return;
      }
      const nInstallments = isSubscription ? 1 : Math.max(1, Number(installments));
      // Calcular datas das parcelas
      const [y, m, d] = purchaseDate.split('-').map(Number);
      let firstMonth = m, firstYear = y;
      // Definir mês/ano da primeira cobrança
      if (d > closingDay) {
        firstMonth++;
        if (firstMonth > 12) { firstMonth = 1; firstYear++; }
      }
      // Para assinatura, criar 12 transações mensais a partir do primeiro pagamento
      const shouldBeRecurring = nInstallments > 1 || isSubscription;
      const recurrenceId = shouldBeRecurring ? `recurrence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined;
      const promises = [];
      if (isSubscription) {
        // Criar 12 transações mensais para assinatura no crédito
        let year = firstYear, month = firstMonth;
        const promises = [];
        for (let i = 0; i < 12; i++) {
          const payDate = `${year}-${String(month).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
          const t: any = {
            id: `credit-${payDate}-${Math.random().toString(36).substr(2, 9)}`,
            name: formData.name,
            amount: Number(total.toFixed(2)),
            date: payDate,
            type: 'expense',
            categoryId: formData.categoryId,
            isPaid: false,
            includeInStats: formData.includeInStats,
            isRecurring: true,
            recurrenceId: recurrenceId,
            purchaseDate,
            totalAmount: total,
            installments: 1,
            isSubscription: true,
            description: formData.description,
          };
          if (t.recurringEndDate === undefined) {
            delete t.recurringEndDate;
          }
          if (t.recurrenceId === undefined) {
            delete t.recurrenceId;
          }
          promises.push(saveTransaction(t));
          month++;
          if (month > 12) { month = 1; year++; }
        }
        await Promise.all(promises);
        toast({ title: 'Assinatura registrada!', description: 'Assinatura agendada para 12 meses.' });
        setIsDialogOpen(false);
        setEditingId(null);
        setFormData({
          name: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'expense', categoryId: '', isPaid: false, includeInStats: true, isRecurring: false, recurringEndDate: undefined,
        });
        setIsCredit(false); setPurchaseDate(''); setTotalAmount(''); setInstallments(1); setIsSubscription(false);
        return;
      } else {
        // Parcelado normal: criar apenas o número de parcelas selecionado
        let year = firstYear, month = firstMonth;
        const promises = [];
        const recurrenceIdParcelado = `recurrence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        for (let i = 0; i < nInstallments; i++) {
          const payDate = `${year}-${String(month).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
          const t: any = {
            id: `credit-${payDate}-${Math.random().toString(36).substr(2, 9)}`,
            name: formData.name,
            amount: Number((total / nInstallments).toFixed(2)),
            date: payDate,
            type: 'expense',
            categoryId: formData.categoryId,
            isPaid: false,
            includeInStats: formData.includeInStats,
            isRecurring: false,
            recurrenceId: recurrenceIdParcelado,
            purchaseDate,
            totalAmount: total,
            installments: nInstallments,
            isSubscription: false,
            description: formData.description,
          };
          if (t.recurringEndDate === undefined) {
            delete t.recurringEndDate;
          }
          if (t.recurrenceId === undefined) {
            delete t.recurrenceId;
          }
          promises.push(saveTransaction(t));
          month++;
          if (month > 12) { month = 1; year++; }
        }
        await Promise.all(promises);
        toast({ title: 'Compra parcelada registrada!', description: `${nInstallments} parcelas agendadas.` });
        setIsDialogOpen(false);
        setEditingId(null);
        setFormData({
          name: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'expense', categoryId: '', isPaid: false, includeInStats: true, isRecurring: false, recurringEndDate: undefined,
        });
        setIsCredit(false); setPurchaseDate(''); setTotalAmount(''); setInstallments(1); setIsSubscription(false);
        return;
      }
    }
    const amountStr = formData.amount.replace(/\D/g, '');
    const amount = parseInt(amountStr, 10) / 100;
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor digite um valor válido",
        variant: "destructive",
      });
      return;
    }
    // No cadastro, gere o recurrenceId uma única vez e use para todas as instâncias
    const recurrenceId = formData.isRecurring
      ? formData.recurrenceId || `recurrence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : undefined;
    const createTransaction = (date: string): Transaction => {
      const base: any = {
        id: `${formData.type}-${date}-${Math.random().toString(36).substr(2, 9)}`,
            name: formData.name,
        amount: Number(amount),
        date,
            type: formData.type,
            categoryId: formData.categoryId,
        isPaid: formData.type === 'income' ? true : formData.isPaid,
            includeInStats: formData.includeInStats,
        isRecurring: formData.isRecurring,
        recurringEndDate: formData.recurringEndDate || null,
      };
      if (formData.description && formData.description.trim() !== '') {
        base.description = formData.description;
      }
      if (recurrenceId) {
        base.recurrenceId = recurrenceId;
      }
      return base;
    };
    if (editingId) {
      // Atualizar transação existente
      const updated = createTransaction(formData.date);
      updated.id = editingId;
      await saveTransaction(updated);
      toast({
        title: "Transação atualizada",
        description: `${formData.type === 'income' ? 'Receita' : 'Despesa'} atualizada com sucesso!`,
      });
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        categoryId: '',
        isPaid: false,
        includeInStats: true,
        isRecurring: false,
        recurringEndDate: undefined,
      });
    } else {
      // Criar nova(s) transação(ões)
      if (formData.isRecurring) {
        // Manipular datas como string para evitar problemas de timezone
        const [startYear, startMonth, startDay] = formData.date.split('-').map(Number);
        let year = startYear;
        let month = startMonth;
        const end = formData.recurringEndDate ? formData.recurringEndDate.split('-').map(Number) : null;
        const promises = [];
        let count = 0;
        while (
          (!end && count < 12) ||
          (end && (year < end[0] || (year === end[0] && month <= end[1])))
        ) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
          const t = createTransaction(dateStr);
          console.log('[RECORRENTE] Salvando transação:', {
            id: t.id,
            date: t.date,
            recurrenceId: t.recurrenceId,
            type: t.type,
            name: t.name
          });
          promises.push(saveTransaction(t));
          month++;
          if (month > 12) {
            month = 1;
            year++;
          }
          count++;
        }
        await Promise.all(promises);
        toast({
          title: "Transações recorrentes adicionadas",
          description: `Transações recorrentes adicionadas com sucesso!`,
        });
      } else {
        const t = createTransaction(formData.date);
        console.log('[UNICA] Salvando transação:', {
          id: t.id,
          date: t.date,
          recurrenceId: t.recurrenceId,
          type: t.type,
          name: t.name
        });
        await saveTransaction(t);
      toast({
        title: "Transação adicionada",
        description: `${formData.type === 'income' ? 'Receita' : 'Despesa'} adicionada com sucesso!`,
      });
    }
    }
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      categoryId: '',
      isPaid: false,
      includeInStats: true,
      isRecurring: false,
      recurringEndDate: undefined,
    });
  };
  
  const handleTogglePaid = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    if (transaction.purchaseDate && !transaction.isPaid) {
      // Só pergunta se for crédito e ainda não está paga
      setConfirmCreditPaid({ open: true, transaction });
    } else {
      // Alterna normalmente (paga <-> não paga) e persiste no Firebase
      if (!user) return;
      await set(ref(database, `transactions/${user.uid}/${transaction.id}`), { ...transaction, isPaid: !transaction.isPaid });
    }
  };
  
  // Função para marcar todas as compras do crédito do mesmo mês como pagas
  const markAllCreditMonthAsPaid = async (transaction: Transaction) => {
    if (!user) return;
    // Pega ano-mês da data de pagamento
    const [year, month] = transaction.date.split('-');
    // Filtra todas as transações de crédito do mesmo mês/ano
    const creditMonth = transactions.filter(t => t.purchaseDate && t.date.startsWith(`${year}-${month}`));
    await Promise.all(creditMonth.map(t => set(ref(database, `transactions/${user.uid}/${t.id}`), { ...t, isPaid: true })));
    setConfirmCreditPaid({ open: false, transaction: null });
    toast({ title: 'Cartão pago', description: 'Todas as compras do crédito deste mês foram marcadas como pagas.' });
  };

  // Função para marcar só a selecionada
  const markSingleCreditAsPaid = async (transaction: Transaction) => {
    if (!user) return;
    await set(ref(database, `transactions/${user.uid}/${transaction.id}`), { ...transaction, isPaid: true });
    setConfirmCreditPaid({ open: false, transaction: null });
    toast({ title: 'Compra paga', description: 'A compra foi marcada como paga.' });
  };
  
  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    toast({
      title: "Transação removida",
      description: "A transação foi removida com sucesso",
    });
  };
  
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sem categoria';
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };
  
  const filterTransactions = () => {
    return getFilteredByDate().filter(transaction => {
      // Search filter
      const matchesSearch = 
        transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const matchesCategory =
        filterCategory && filterCategory !== 'Todas'
          ? transaction.categoryId === filterCategory
          : true;
      
      // Type filter
      const matchesType = 
        filterType === 'all'
          ? true
          : filterType === 'income'
            ? transaction.type === 'income'
            : transaction.type === 'expense';
      
      // Paid status filter
      const matchesPaid = 
        filterPaid === 'all' ? true : 
        filterPaid === 'paid' ? transaction.isPaid : 
        !transaction.isPaid;
      
      return matchesSearch && matchesCategory && matchesType && matchesPaid;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  
  const filteredTransactions = filterTransactions();
  const unpaidTransactions = filteredTransactions.filter(t => !t.isPaid);
  const paidTransactions = filteredTransactions.filter(t => t.isPaid);
  
  // Generate months for select
  const generateMonthOptions = () => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        monthsSet.add(value);
      }
    });
    // Ordenar do mais recente para o mais antigo
    const monthsArr = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    // Encontrar o índice do mês atual
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const currentIndex = monthsArr.indexOf(currentMonth);
    // Pegar 10 antes e 10 depois (incluindo o atual)
    const start = Math.max(0, currentIndex - 12);
    const end = Math.min(monthsArr.length, currentIndex + 13);
    const limitedMonths = monthsArr.slice(start, end);
    return limitedMonths.map(value => {
      const [year, month] = value.split('-');
      const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('pt-BR', { month: 'long' });
      return { value, label: `${monthName} ${year}` };
    });
  };

  // Generate years for select
  const generateYearOptions = () => {
    const yearsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        yearsSet.add(d.getFullYear().toString());
      }
    });
    // Ordenar do mais recente para o mais antigo
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  };

  // Handler para exclusão recorrente
  const handleDeleteRecurring = async (transaction: Transaction, option: 'single' | 'future' | 'all') => {
    console.log('[DEBUG] Chamou handleDeleteRecurring', { transaction, option });
    if (!transaction.recurrenceId) {
      await deleteTransaction(transaction.id);
      return;
    }
    let toDelete: Transaction[] = [];
    if (option === 'all') {
      toDelete = transactions.filter(t => t.recurrenceId === transaction.recurrenceId);
    } else if (option === 'future') {
      toDelete = transactions.filter(
        t => t.recurrenceId === transaction.recurrenceId && t.date >= transaction.date
      );
    } else {
      toDelete = [transaction];
    }
    console.log('[DEBUG] Exclusão recorrente:', {
      recurrenceId: transaction.recurrenceId,
      option,
      toDeleteIds: toDelete.map(t => t.id),
      toDelete
    });
    await Promise.all(toDelete.map(t => deleteTransaction(t.id)));
  };

  // Handler para edição recorrente
  const handleEditRecurring = async (transaction: Transaction, updatedData: Partial<Transaction>, option: 'single' | 'future' | 'all') => {
    if (!transaction.recurrenceId) {
      await saveTransaction({ ...transaction, ...updatedData });
      return;
    }
    let toEdit: Transaction[] = [];
    if (option === 'all') {
      toEdit = transactions.filter(t => t.recurrenceId === transaction.recurrenceId);
    } else if (option === 'future') {
      toEdit = transactions.filter(
        t => t.recurrenceId === transaction.recurrenceId && t.date >= transaction.date
      );
    } else {
      toEdit = [transaction];
    }

    // Função para atualizar apenas o dia da data
    const getUpdatedDate = (originalDate: string, newDate: string) => {
      const [origYear, origMonth] = originalDate.split('-');
      const newDay = newDate.split('-')[2];
      return `${origYear}-${origMonth}-${newDay}`;
    };

    await Promise.all(toEdit.map(t => {
      let updatedDate = t.date;
      if (updatedData.date) {
        updatedDate = getUpdatedDate(t.date, updatedData.date);
      }
      const updatedTransaction = { ...t, ...updatedData, date: updatedDate };
      if (transaction.recurrenceId) {
        updatedTransaction.recurrenceId = transaction.recurrenceId;
      } else {
        delete updatedTransaction.recurrenceId;
      }
      return saveTransaction(updatedTransaction);
    }));
  };

  // Handler para abrir modal de edição
  const onEditClick = (transaction: Transaction) => {
    setEditFormTemp({ transaction, updatedData: null });
    setFormData({
      name: transaction.name,
      description: transaction.description || '',
      amount: transaction.amount.toFixed(2),
      date: transaction.date,
      type: transaction.type,
      categoryId: transaction.categoryId,
      isPaid: transaction.isPaid,
      includeInStats: transaction.includeInStats,
      isRecurring: transaction.isRecurring,
      recurringEndDate: transaction.recurringEndDate,
    });
    setEditingId(transaction.id);
    setIsDialogOpen(true);
  };

  // Handler para abrir modal de exclusão
  const onDeleteClick = (transaction: Transaction) => {
    setEditFormTemp({ transaction, updatedData: null });
    setConfirmRecurring({ open: true, action: 'delete', transaction });
  };

  // No handleEditSubmit, se for recorrente, abre o modal de seleção
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const amountStr = formData.amount.replace(/\D/g, '');
    const amount = parseInt(amountStr, 10) / 100;
    const updatedData: Partial<Transaction> = {
      name: formData.name,
      description: formData.description,
      amount: Number(amount),
      date: formData.date,
      type: formData.type,
      categoryId: formData.categoryId,
      isPaid: formData.isPaid,
      includeInStats: formData.includeInStats,
      isRecurring: formData.isRecurring,
      recurringEndDate: formData.recurringEndDate || null,
    };
    const transaction = transactions.find(t => t.id === editingId);
    if (transaction && transaction.isRecurring && transaction.recurrenceId) {
      await handleEditRecurring(transaction, updatedData, recurringOption);
      toast({ title: 'Transação(s) atualizada(s) com sucesso!' });
      setEditFormTemp({ transaction: null, updatedData: null });
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        categoryId: '',
        isPaid: false,
        includeInStats: true,
        isRecurring: false,
        recurringEndDate: undefined,
      });
      return;
    }
    // Não recorrente, salva normalmente
    await saveTransaction({ ...transaction, ...updatedData });
    toast({ title: 'Transação atualizada!' });
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      categoryId: '',
      isPaid: false,
      includeInStats: true,
      isRecurring: false,
      recurringEndDate: undefined,
    });
  };

  const handleDeleteClick = (transaction: Transaction) => {
    if (transaction.isRecurring && transaction.recurrenceId) {
      setConfirmRecurring({ open: true, action: 'delete', transaction });
    } else {
      handleDeleteTransaction(transaction.id);
    }
  };

  // Antes de renderizar os cards
  console.log('[DEBUG] Transações filtradas para exibição:', filteredTransactions);
  
  return (
    <MainLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden px-2">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Receitas</span>
                <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                  R$ {totalIncome.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Despesas</span>
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  R$ {totalExpenses.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Saldo</span>
                <span className={`text-lg font-semibold ${balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  R$ {balance.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">A pagar</span>
                <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  R$ {pendingExpenses.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Date Filter and Dashboard Link */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex gap-2 items-center">
            <Select
              value={filterPeriod}
              onValueChange={(value: 'day' | 'week' | 'month' | 'year') => setFilterPeriod(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Diário</SelectItem>
                <SelectItem value="week">Semanal</SelectItem>
                <SelectItem value="month">Mensal</SelectItem>
                <SelectItem value="year">Anual</SelectItem>
              </SelectContent>
            </Select>
            
            {filterPeriod === 'day' && (
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full"
              />
            )}
            
            {filterPeriod === 'month' && (
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {filterPeriod === 'year' && (
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {generateYearOptions().map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/finance/dashboard')}
          >
            <BarChart className="mr-2 h-4 w-4" />
            Ver dashboard
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transação"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <FilterableSelect
            options={[
              'Todas',
              ...categories
                .filter(cat => cat.type === formData.type)
                .map(cat => cat.name)
            ]}
            value={formData.categoryId}
            onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
            placeholder="Selecione uma categoria"
            className="w-full sm:w-[200px]"
          />
        </div>
        
        {/* Transaction Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all" onClick={() => setFilterType('all')}>
              Todas
            </TabsTrigger>
            <TabsTrigger value="income" onClick={() => setFilterType('income')}>
              Receitas
            </TabsTrigger>
            <TabsTrigger value="expense" onClick={() => setFilterType('expense')}>
              Despesas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                Transações ({filteredTransactions.length})
              </h3>
            </div>

            {/* Renderização única dos cards, com títulos/separadores, pendentes primeiro */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar transação
                </Button>
            </div>
            ) : (
              (() => {
                // Separe pendentes e realizadas, mantendo a ordem
                const pendentes = filteredTransactions.filter(t => !t.isPaid && (filterPaid !== 'paid'));
                const realizadas = filteredTransactions.filter(t => t.isPaid && (filterPaid !== 'pending'));
                return (
                  <>
                    {pendentes.length > 0 && (
                      <>
                        <h4 className="text-xs text-muted-foreground mb-2">Transações pendentes</h4>
                        {pendentes.map(transaction => (
                          <Card
                            key={transaction.id}
                            className={`card-hover ${filterType !== 'all' && transaction.type !== filterType ? 'hidden' : ''}`}
                          >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div className="flex items-center">
                              {transaction.type === 'income' ? (
                                <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                              )}
                              <div>
                                        <h4 className="font-medium leading-none flex items-center gap-1">
                                  {transaction.name}
                                          {transaction.isRecurring && (
                                            <Repeat className="inline h-4 w-4 text-blue-400 opacity-70" title="Recorrente" />
                                          )}
                                          {transaction.isRecurring && transaction.recurringEndDate && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                              até {(() => {
                                                const d = new Date(transaction.recurringEndDate);
                                                return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                              })()}
                                            </span>
                                          )}
                                </h4>
                                {transaction.description && (
                                  <p
                                    className="text-sm text-muted-foreground mt-1 break-words w-full"
                                    style={{ wordBreak: 'break-word' }}
                                    title={transaction.description}
                                  >
                                    {transaction.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                                      <div className={`font-medium text-lg ${transaction.type === 'income'
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {transaction.type === 'income' ? "+" : "-"}
                                R$ {transaction.amount.toFixed(2)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(transaction.date)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="outline" className="bg-secondary">
                                      {transaction.categoryId || 'Sem categoria'}
                            </Badge>

                            <div className="flex items-center gap-2">
                              {transaction.type === 'expense' && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>Pendente</span>
                                  <Switch 
                                    checked={transaction.isPaid}
                                    onCheckedChange={() => handleTogglePaid(transaction.id)}
                                  />
                                  <span>Paga</span>
                                </div>
                              )}
                              
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                          onClick={() => onEditClick(transaction)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                          onClick={() => onDeleteClick(transaction)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                      </>
                    )}
                    {realizadas.length > 0 && (
                      <>
                        {pendentes.length > 0 && (
                          <div className="flex items-center my-2">
                    <Separator className="flex-1" />
                            <span className="mx-4 text-xs text-muted-foreground">Transações realizadas</span>
                    <Separator className="flex-1" />
                  </div>
                )}
                        {realizadas.map(transaction => (
                          <Card
                            key={transaction.id}
                            className={`card-hover bg-muted/30 ${filterType !== 'all' && transaction.type !== filterType ? 'hidden' : ''}`}
                          >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div className="flex items-center">
                              {transaction.type === 'income' ? (
                                <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                              )}
                              <div>
                                        <h4 className="font-medium leading-none flex items-center gap-1">
                                  {transaction.name}
                                          {transaction.isRecurring && (
                                            <Repeat className="inline h-4 w-4 text-blue-400 opacity-70" />
                                          )}
                                          {transaction.isRecurring && transaction.recurringEndDate && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                              até {(() => {
                                                const d = new Date(transaction.recurringEndDate);
                                                return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                              })()}
                                            </span>
                                          )}
                                </h4>
                                {transaction.description && (
                                  <p
                                    className="text-sm text-muted-foreground mt-1 break-words w-full"
                                    style={{ wordBreak: 'break-word' }}
                                    title={transaction.description}
                                  >
                                    {transaction.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                                      <div className={`font-medium text-lg ${transaction.type === 'income'
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {transaction.type === 'income' ? "+" : "-"}
                                R$ {transaction.amount.toFixed(2)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(transaction.date)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="outline" className="bg-secondary">
                                      {transaction.categoryId || 'Sem categoria'}
                            </Badge>
                            
                            <div className="flex items-center gap-2">
                              {transaction.type === 'expense' && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>Pendente</span>
                                  <Switch 
                                    checked={transaction.isPaid}
                                    onCheckedChange={() => handleTogglePaid(transaction.id)}
                                  />
                                  <span>Paga</span>
                                </div>
                              )}
                              
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                          onClick={() => onEditClick(transaction)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                          onClick={() => onDeleteClick(transaction)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                      </>
                    )}
                  </>
                );
              })()
            )}
          </TabsContent>
          
          <TabsContent value="income">
            <div className="space-y-3">
              {filteredTransactions.filter(t => t.type === 'income').length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma receita encontrada.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'income' }));
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar receita
                  </Button>
                </div>
              ) : (
                filteredTransactions
                  .filter(t => t.type === 'income')
                  .map(transaction => (
                    <Card key={transaction.id} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div className="flex items-center">
                                <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                                <div>
                                  <h4 className="font-medium leading-none flex items-center gap-1">
                                    {transaction.name}
                                    {transaction.isRecurring && (
                                      <Repeat className="inline h-4 w-4 text-blue-400 opacity-70" />
                                    )}
                                    {transaction.isRecurring && transaction.recurringEndDate && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        até {(() => {
                                          const d = new Date(transaction.recurringEndDate);
                                          return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                        })()}
                                      </span>
                                    )}
                                  </h4>
                                  {transaction.description && (
                                    <p
                                      className="text-sm text-muted-foreground mt-1 break-words w-full"
                                      style={{ wordBreak: 'break-word' }}
                                      title={transaction.description}
                                    >
                                      {transaction.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-lg text-green-600 dark:text-green-400">
                                  +R$ {Number(transaction.amount).toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(transaction.date)}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant="outline" className="bg-secondary">
                                {transaction.categoryId || 'Sem categoria'}
                              </Badge>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onEditClick(transaction)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onDeleteClick(transaction)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="expense">
            <div className="space-y-3">
              {filteredTransactions.filter(t => t.type === 'expense').length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma despesa encontrada.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'expense' }));
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar despesa
                  </Button>
                </div>
              ) : (
                filteredTransactions
                  .filter(t => t.type === 'expense')
                  .map(transaction => (
                    <Card key={transaction.id} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div className="flex items-center">
                                <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                                <div>
                                  <h4 className="font-medium leading-none flex items-center gap-1">
                                    {transaction.name}
                                    {transaction.isRecurring && (
                                      <Repeat className="inline h-4 w-4 text-blue-400 opacity-70" />
                                    )}
                                    {transaction.isRecurring && transaction.recurringEndDate && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        até {(() => {
                                          const d = new Date(transaction.recurringEndDate);
                                          return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                        })()}
                                      </span>
                                    )}
                                  </h4>
                                  {transaction.description && (
                                    <p
                                      className="text-sm text-muted-foreground mt-1 break-words w-full"
                                      style={{ wordBreak: 'break-word' }}
                                      title={transaction.description}
                                    >
                                      {transaction.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-lg text-red-600 dark:text-red-400">
                                  -R$ {Number(transaction.amount).toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(transaction.date)}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant="outline" className="bg-secondary">
                                {transaction.categoryId || 'Sem categoria'}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {transaction.type === 'expense' && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span>Pendente</span>
                                    <Switch
                                      checked={transaction.isPaid}
                                      onCheckedChange={() => handleTogglePaid(transaction.id)}
                                    />
                                    <span>Paga</span>
                                  </div>
                                )}

                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onEditClick(transaction)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onDeleteClick(transaction)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          key={editingId ? `edit-${editingId}-${formData.isRecurring}` : 'new'}
          className="max-h-[85vh] w-full max-w-sm sm:max-w-lg mx-auto p-2 sm:p-6 overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId 
                ? `Editar ${formData.type === 'income' ? 'Receita' : 'Despesa'}`
                : `Adicionar ${formData.type === 'income' ? 'Receita' : 'Despesa'}`
              }
            </DialogTitle>
            <DialogDescription>
              {editingId 
                ? `Atualize os detalhes da ${formData.type === 'income' ? 'receita' : 'despesa'}`
                : `Preencha os detalhes da ${formData.type === 'income' ? 'receita' : 'despesa'}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingId ? handleEditSubmit : handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <div className="flex items-center justify-around p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className={`h-5 w-5 ${formData.type === 'expense' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={formData.type === 'expense' ? 'font-medium' : 'text-muted-foreground'}>Despesa</span>
                </div>
                <Switch
                  checked={formData.type === 'income'}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    type: checked ? 'income' : 'expense',
                    isPaid: checked ? true : prev.isPaid,
                    categoryId: '' // Reset category when changing type
                  }))}
                />
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className={`h-5 w-5 ${formData.type === 'income' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={formData.type === 'income' ? 'font-medium' : 'text-muted-foreground'}>Receita</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Salário"
                value={formData.name}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Ex: Salário mensal"
                value={formData.description}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              {formData.type === 'expense' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCredit"
                    checked={isCredit}
                    onCheckedChange={checked => {
                      setIsCredit(!!checked);
                      if (checked) setFormData(prev => ({ ...prev, isRecurring: false }));
                    }}
                  />
                  <Label htmlFor="isCredit">Pago no crédito</Label>
                </div>
              )}

              {isCredit ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Data da compra</Label>
                    <Input
                      id="purchaseDate"
                      name="purchaseDate"
                      type="date"
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Valor total da compra</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      placeholder="0,00"
                      value={totalAmount}
                      onChange={e => setTotalAmount(formatCurrency(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isSubscription"
                      checked={isSubscription}
                      onCheckedChange={checked => setIsSubscription(!!checked)}
                    />
                    <Label htmlFor="isSubscription">Assinatura (sem parcelas)</Label>
                  </div>
                  {!isSubscription && (
                    <div className="space-y-2">
                      <Label htmlFor="installments">Parcelas</Label>
                      <Input
                        id="installments"
                        name="installments"
                        type="number"
                        min={1}
                        max={36}
                        value={installments}
                        onChange={e => setInstallments(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  name="amount"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={handleChange}
                        className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                        className="w-full"
                />
              </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <FilterableSelect
                options={[
                  'Todas',
                  ...categories
                    .filter(cat => cat.type === formData.type)
                    .map(cat => cat.name)
                ]}
                value={formData.categoryId}
                onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                placeholder="Selecione uma categoria"
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeInStats"
                checked={formData.includeInStats}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, includeInStats: checked as boolean }))
                }
              />
              <Label htmlFor="includeInStats">Incluir nas estatísticas</Label>
            </div>
            
            {formData.type === 'expense' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPaid"
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isPaid: checked as boolean }))
                  }
                />
                <Label htmlFor="isPaid">Marcar como paga</Label>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={checked => {
                    if (isCredit && checked) return; // Não permite ativar recorrência se crédito ativo
                    setFormData(prev => ({ ...prev, isRecurring: !!checked }));
                    if (checked) setIsCredit(false); // Se ativar recorrência, desativa crédito
                  }}
                  disabled={isCredit}
                />
                <Label htmlFor="isRecurring" className={isCredit ? 'text-muted-foreground' : ''}>Transação recorrente (mensal)</Label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasEndDate"
                      checked={!!formData.recurringEndDate}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          recurringEndDate: checked ? new Date().toISOString().split('T')[0] : undefined
                        }))
                      }
                    />
                    <Label htmlFor="hasEndDate">Programar fim da recorrência</Label>
                  </div>

                  {formData.recurringEndDate && (
                    <div className="space-y-2">
                      <Label htmlFor="recurringEndDate">Data de término</Label>
                      <Input
                        id="recurringEndDate"
                        type="date"
                        value={formData.recurringEndDate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recurringEndDate: e.target.value
                        }))}
                        min={formData.date}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {editingId && formData.isRecurring && (
              <div className="space-y-2 border-t pt-4 mt-4">
                <Label>Configurações de Recorrência</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editRecurringOption"
                      value="single"
                      checked={recurringOption === 'single'}
                      onChange={() => setRecurringOption('single')}
                    />
                    Apenas esta
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editRecurringOption"
                      value="future"
                      checked={recurringOption === 'future'}
                      onChange={() => setRecurringOption('future')}
                    />
                    Esta e as próximas
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editRecurringOption"
                      value="all"
                      checked={recurringOption === 'all'}
                      onChange={() => setRecurringOption('all')}
                    />
                    Todas
                  </label>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button type="submit">
                {editingId 
                  ? `Atualizar ${formData.type === 'income' ? 'Receita' : 'Despesa'}`
                  : `Adicionar ${formData.type === 'income' ? 'Receita' : 'Despesa'}`
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Floating action button */}
      <div className="fixed right-6 bottom-24 md:bottom-8 z-10">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
              amount: '',
              date: new Date().toISOString().split('T')[0],
              type: 'expense',
              categoryId: '',
              isPaid: false,
              includeInStats: true,
              isRecurring: false,
              recurringEndDate: undefined,
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modal de confirmação recorrente */}
      <ConfirmDialog open={confirmRecurring.open} onOpenChange={open => setConfirmRecurring(prev => ({ ...prev, open }))}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>
              {confirmRecurring.action === 'delete' ? 'Excluir recorrência' : 'Editar recorrência'}
            </ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="space-y-2 py-2">
            <p>Esta transação faz parte de uma recorrência. O que deseja fazer?</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="recurringOption" checked={recurringOption === 'single'} onChange={() => setRecurringOption('single')} />
                Apenas esta
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="recurringOption" checked={recurringOption === 'future'} onChange={() => setRecurringOption('future')} />
                Esta e as próximas
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="recurringOption" checked={recurringOption === 'all'} onChange={() => setRecurringOption('all')} />
                Todas
              </label>
            </div>
          </div>
          <ConfirmDialogFooter className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setConfirmRecurring({ open: false, action: null, transaction: null })}>Cancelar</Button>
            <Button onClick={async () => {
              console.log('[DEBUG] Clique no botão de confirmação do modal', {
                transaction: confirmRecurring.transaction,
                option: recurringOption
              });
              if (!confirmRecurring.transaction) return;
              if (confirmRecurring.action === 'delete') {
                if (confirmRecurring.transaction.isRecurring && confirmRecurring.transaction.recurrenceId) {
                  await handleDeleteRecurring(confirmRecurring.transaction, recurringOption);
                  toast({ title: 'Transação(s) excluída(s) com sucesso!' });
                } else {
                  await deleteTransaction(confirmRecurring.transaction.id);
                  toast({ title: 'Transação excluída com sucesso!' });
                }
              } else if (confirmRecurring.action === 'edit') {
                if (editFormTemp.transaction && editFormTemp.updatedData) {
                  await handleEditRecurring(editFormTemp.transaction, editFormTemp.updatedData, recurringOption);
                  toast({ title: 'Transação(s) atualizada(s) com sucesso!' });
                  setEditFormTemp({ transaction: null, updatedData: null });
                }
              }
              setConfirmRecurring({ open: false, action: null, transaction: null });
              setEditingId(null);
              setFormData({
                name: '',
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                categoryId: '',
                isPaid: false,
                includeInStats: true,
                isRecurring: false,
                recurringEndDate: undefined,
              });
            }}>
              Confirmar
            </Button>
          </ConfirmDialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>

      {/* Dialog para marcar todas as compras do crédito do mês como pagas */}
      <SimpleDialog open={confirmCreditPaid.open} onOpenChange={open => setConfirmCreditPaid(prev => ({ ...prev, open }))}>
        <SimpleDialogContent>
          <SimpleDialogHeader>
            <SimpleDialogTitle>Marcar todas as compras do crédito como pagas?</SimpleDialogTitle>
          </SimpleDialogHeader>
          <div className="py-2">Deseja marcar <b>todas as compras do cartão deste mês</b> como pagas? (Inclui todas as compras de crédito com pagamento neste mês)</div>
          <SimpleDialogFooter className="flex flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmCreditPaid({ open: false, transaction: null })}>Não, só esta</Button>
            <Button onClick={() => confirmCreditPaid.transaction && markAllCreditMonthAsPaid(confirmCreditPaid.transaction)}>Sim, todas do mês</Button>
          </SimpleDialogFooter>
        </SimpleDialogContent>
      </SimpleDialog>
    </MainLayout>
  );
};

export default Transactions;