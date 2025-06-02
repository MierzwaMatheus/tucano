import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, BarChart, ResponsiveContainer, Cell, Pie, Legend, Tooltip, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Paleta de cores vibrantes e contrastantes
const palette = [
  '#6366f1', '#f59e42', '#10b981', '#ef4444', '#fbbf24',
  '#3b82f6', '#a21caf', '#e11d48', '#14b8a6', '#f472b6',
];

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Label customizado para badge dentro do gráfico de pizza
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.03) return null; // Não exibe para fatias muito pequenas
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const value = `${(percent * 100).toFixed(0)}%`;
  return (
    <g>
      <rect x={x - 18} y={y - 12} rx={8} ry={8} width={36} height={24} fill="#6366f1" />
      <text x={x} y={y + 2} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">{value}</text>
    </g>
  );
};

const Dashboard = () => {
  const [filterPeriod, setFilterPeriod] = useState('month');
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [shoppingLists, setShoppingLists] = useState<any[]>([]);
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);

  // Buscar transações do Firebase
  useEffect(() => {
    if (!user) return;
    const transRef = ref(database, `transactions/${user.uid}`);
    const unsubscribe = onValue(transRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.entries(data).map(([id, t]) => ({ id, ...t }));
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
        const loaded = [];
        Object.entries(data).forEach(([type, cats]) => {
          Object.entries(cats || {}).forEach(([id, cat]) => {
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

  // Buscar listas de compras concluídas do Firebase
  useEffect(() => {
    if (!user) return;
    const listsRef = ref(database, `shopping-lists/${user.uid}`);
    const unsubscribe = onValue(listsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lists = Object.entries(data).map(([id, list]) => ({ id, ...(list as Record<string, any>) }));
        setShoppingLists(lists.filter((l: any) => l.isCompleted));
      } else {
        setShoppingLists([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Buscar itens das listas concluídas do mês selecionado
  useEffect(() => {
    if (!user || !shoppingLists.length) { setShoppingItems([]); return; }
    const [selYear, selMonth] = selectedMonth.split('-');
    console.log('[DASHBOARD] selectedMonth:', selectedMonth, 'selYear:', selYear, 'selMonth:', selMonth);
    console.log('[DASHBOARD] Todas as listas concluídas:', shoppingLists);
    const monthLists = shoppingLists.filter(list => {
      if (!list.month || !list.year) return false;
      const monthNum = (monthNames.findIndex(m => m.toLowerCase() === String(list.month).toLowerCase()) + 1).toString().padStart(2, '0');
      console.log('[DASHBOARD] Comparando lista:', list.name, '| month:', list.month, '| monthNum:', monthNum, '| year:', list.year);
      return String(list.year) === selYear && monthNum === selMonth;
    });
    if (!monthLists.length) { setShoppingItems([]); return; }
    let allItems: any[] = [];
    monthLists.forEach((list: any) => {
      if (list.items && typeof list.items === 'object' && Object.keys(list.items).length > 0) {
        const itemsArr = Object.values(list.items);
        allItems = allItems.concat(itemsArr);
      }
    });
    console.log('[DASHBOARD] Listas de compras do mês:', monthLists);
    console.log('[DASHBOARD] Itens encontrados:', allItems);
    setShoppingItems(allItems);
  }, [shoppingLists, selectedMonth]);

  // Agrupar gastos de compras por categoria
  const shoppingByCategory = shoppingItems.reduce((acc: Record<string, number>, item: any) => {
    if (!item.category) return acc;
    if (!acc[item.category]) acc[item.category] = 0;
    acc[item.category] += Number(item.price || 0) * Number(item.quantity || 1);
    return acc;
  }, {});
  const shoppingCatsArr = Object.entries(shoppingByCategory).map(([name, value], idx) => ({
    name,
    value: Number(value),
    color: palette[idx % palette.length],
  })).sort((a, b) => b.value - a.value);
  const totalShopping = shoppingCatsArr.reduce((sum, cat) => sum + cat.value, 0);
  console.log('[DASHBOARD] Categorias de compras agrupadas:', shoppingCatsArr);

  // Função para gerar opções de meses
  const generateMonthOptions = () => {
    const monthsSet = new Set();
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

  // Função para filtrar transações conforme o período selecionado
  const filterTransactionsByPeriod = (transactions, period) => {
    if (!transactions.length) return [];
    const now = new Date();
    if (period === 'month') {
      // Usar selectedMonth
      return transactions.filter(t => t.date.startsWith(selectedMonth));
    }
    if (period === 'year') {
      const year = now.getFullYear();
      return transactions.filter(t => t.date.startsWith(`${year}-`));
    }
    if (period === 'quarter') {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const quarter = Math.floor((month - 1) / 3) + 1;
      const months = [1, 2, 3].map(m => String((quarter - 1) * 3 + m).padStart(2, '0'));
      return transactions.filter(t => t.date.startsWith(`${year}-`) && months.includes(t.date.split('-')[1]));
    }
    return transactions;
  };

  const filteredTransactions = filterTransactionsByPeriod(transactions, filterPeriod);

  // 1. Gastos por categoria (resumido: 5 maiores + Outros)
  const allExpenseCats = categories.filter(cat => cat.type === 'expense');
  const expenseByCategoryFull = allExpenseCats.map((cat, idx) => ({
    name: cat.name,
    value: filteredTransactions.filter(t => t.categoryId === cat.name && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
    color: palette[idx % palette.length],
  })).filter(cat => cat.value > 0);
  const sortedExpenseCats = [...expenseByCategoryFull].sort((a, b) => b.value - a.value);
  const top5ExpenseCats = sortedExpenseCats.slice(0, 5);
  const outrosExpense = sortedExpenseCats.slice(5).reduce((sum, cat) => sum + cat.value, 0);
  const expenseByCategory = outrosExpense > 0
    ? [...top5ExpenseCats, { name: 'Outros', value: outrosExpense, color: '#a1a1aa' }]
    : top5ExpenseCats;

  // 2. Entradas por categoria (resumido: 5 maiores + Outros)
  const allIncomeCats = categories.filter(cat => cat.type === 'income');
  const incomeByCategoryFull = allIncomeCats.map((cat, idx) => ({
    name: cat.name,
    value: filteredTransactions.filter(t => t.categoryId === cat.name && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
    color: palette[idx % palette.length],
  })).filter(cat => cat.value > 0);
  const sortedIncomeCats = [...incomeByCategoryFull].sort((a, b) => b.value - a.value);
  const top5IncomeCats = sortedIncomeCats.slice(0, 5);
  const outrosIncome = sortedIncomeCats.slice(5).reduce((sum, cat) => sum + cat.value, 0);
  const incomeByCategory = outrosIncome > 0
    ? [...top5IncomeCats, { name: 'Outros', value: outrosIncome, color: '#a1a1aa' }]
    : top5IncomeCats;

  // 3. Principais Gastos (transações)
  const topExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  // 4. Principais Entradas (transações)
  const topIncomes = filteredTransactions
    .filter(t => t.type === 'income')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  // 5. Gastos e Entradas por categoria (detalhado)
  const detailedCatsRaw = categories.map((cat, idx) => {
    const value = filteredTransactions
      .filter(t => t.categoryId === cat.name && t.type === cat.type)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      name: cat.name,
      type: cat.type,
      value,
      color: palette[idx % palette.length],
    };
  }).filter(cat => cat.value > 0);
  const detailedCats = [
    ...detailedCatsRaw.filter(c => c.type === 'expense').sort((a, b) => b.value - a.value),
    ...detailedCatsRaw.filter(c => c.type === 'income').sort((a, b) => b.value - a.value),
  ];

  // 6. Gastos no cartão de crédito por categoria
  const creditCats = categories
    .filter(cat => cat.type === 'expense')
    .map((cat, idx) => {
      const value = filteredTransactions
        .filter(t => t.categoryId === cat.name && t.type === 'expense' && t.purchaseDate)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        name: cat.name,
        value,
        color: palette[idx % palette.length],
      };
    })
    .filter(cat => cat.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalCreditExpenses = creditCats.reduce((sum, cat) => sum + cat.value, 0);

  const totalExpenses = detailedCats.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.value, 0);
  const totalIncomes = detailedCats.filter(c => c.type === 'income').reduce((sum, c) => sum + c.value, 0);

  // 2. Receitas vs Despesas por mês (apenas do período filtrado)
  const monthlyMap = {};
  filteredTransactions.forEach(t => {
    const [year, month] = t.date.split('-');
    const key = `${year}-${month}`;
    if (!monthlyMap[key]) monthlyMap[key] = { name: `${monthNames[Number(month) - 1]}/${year}`, income: 0, expense: 0 };
    if (t.type === 'income') monthlyMap[key].income += Number(t.amount);
    if (t.type === 'expense') monthlyMap[key].expense += Number(t.amount);
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.name.localeCompare(b.name));

  // 3. Saldo por mês
  let runningBalance = 0;
  const balanceData = monthlyData.map((m) => {
    runningBalance += (m.income - m.expense);
    return { name: m.name, balance: runningBalance };
  });
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Dashboard Financeiro</h2>
          <Select
            value={filterPeriod}
            onValueChange={setFilterPeriod}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
            {filterPeriod === 'month' && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Category Spending */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Gastos por Categoria (Resumido)</CardTitle>
              <CardDescription>Top 5 categorias de despesa + Outros</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-80">
                {expenseByCategory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum gasto encontrado neste período.</div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                        data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                        outerRadius={65}
                      fill="#8884d8"
                      dataKey="value"
                        label={renderPieLabel}
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-exp-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value) => [`R$ ${value}`, 'Valor']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Entradas por Categoria (Resumido) */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Entradas por Categoria (Resumido)</CardTitle>
              <CardDescription>Top 5 categorias de receita + Outros</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-80">
                {incomeByCategory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Nenhuma entrada encontrada neste período.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={65}
                        fill="#10b981"
                        dataKey="value"
                        label={renderPieLabel}
                      >
                        {incomeByCategory.map((entry, index) => (
                          <Cell key={`cell-inc-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                      <Tooltip formatter={(value) => [`R$ ${value}`, 'Valor']} />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Income vs Expenses */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Receitas vs. Despesas</CardTitle>
              <CardDescription>Comparativo mensal</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${value}`, '']}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="#8b5cf6" />
                    <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Top Expenses Categories */}
          <Card className="col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Principais Gastos</CardTitle>
              <CardDescription>Transações de maior valor (despesas)</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {topExpenses.length === 0 ? (
                  <div className="text-muted-foreground">Nenhum gasto encontrado neste período.</div>
                ) : (
                  topExpenses.map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-6 text-muted-foreground">{idx + 1}.</span>
                        <span>{t.name}</span>
                      </div>
                      <div className="font-medium text-red-500">R$ {Number(t.amount).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Top Incomes Categories */}
          <Card className="col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Principais Entradas</CardTitle>
              <CardDescription>Transações de maior valor (receitas)</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {topIncomes.length === 0 ? (
                  <div className="text-muted-foreground">Nenhuma entrada encontrada neste período.</div>
                ) : (
                  topIncomes.map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                        <span className="w-6 text-muted-foreground">{idx + 1}.</span>
                        <span>{t.name}</span>
                      </div>
                      <div className="font-medium text-green-500">R$ {Number(t.amount).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Gastos e Entradas por Categoria (Detalhado) */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Gastos e Entradas por Categoria (Detalhado)</CardTitle>
              <CardDescription>Distribuição detalhada por categoria</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {detailedCats.length === 0 ? (
                  <div className="text-muted-foreground">Nenhuma categoria encontrada neste período.</div>
                ) : (
                  detailedCats.map((cat, idx) => {
                    const percent = cat.type === 'expense' && totalExpenses > 0
                      ? (cat.value / totalExpenses) * 100
                      : cat.type === 'income' && totalIncomes > 0
                        ? (cat.value / totalIncomes) * 100
                        : 0;
                    return (
                      <div
                        key={cat.name}
                        className={`flex items-center justify-between ${idx % 2 === 1 ? 'bg-muted/20' : ''} rounded px-2`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="block w-3 h-3 rounded-full" style={{ background: cat.color }}></span>
                          <span>{cat.name}</span>
                          <span className={`text-xs ${cat.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>{cat.type === 'expense' ? 'Despesa' : 'Receita'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{percent.toFixed(1)}%</span>
                          <span className={`font-medium ${cat.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>R$ {cat.value.toFixed(2)}</span>
                    </div>
                  </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gastos no Cartão de Crédito por Categoria */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Gastos no Cartão de Crédito</CardTitle>
              <CardDescription>Distribuição por categoria</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {creditCats.length === 0 ? (
                  <div className="text-muted-foreground">Nenhum gasto no cartão encontrado neste período.</div>
                ) : (
                  creditCats.map((cat, idx) => {
                    const percent = (cat.value / totalCreditExpenses) * 100;
                    return (
                      <div
                        key={cat.name}
                        className={`flex items-center justify-between ${idx % 2 === 1 ? 'bg-muted/20' : ''} rounded px-2`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="block w-3 h-3 rounded-full" style={{ background: cat.color }}></span>
                          <span>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{percent.toFixed(1)}%</span>
                          <span className="font-medium text-red-500">R$ {cat.value.toFixed(2)}</span>
                        </div>
                </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gastos de Compras por Categoria */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Gastos de Compras por Categoria</CardTitle>
              <CardDescription>Baseado nas listas de compras concluídas do mês</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {shoppingCatsArr.length === 0 ? (
                  <div className="text-muted-foreground">Nenhum gasto de compras encontrado neste mês.</div>
                ) : (
                  shoppingCatsArr.map((cat, idx) => {
                    const percent = (cat.value / totalShopping) * 100;
                    return (
                      <div
                        key={cat.name}
                        className={`flex items-center justify-between ${idx % 2 === 1 ? 'bg-muted/20' : ''} rounded px-2`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="block w-3 h-3 rounded-full" style={{ background: cat.color }}></span>
                          <span>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{percent.toFixed(1)}%</span>
                          <span className="font-medium text-blue-500">R$ {Number(cat.value).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
