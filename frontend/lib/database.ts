import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Storage keys
const STORAGE_KEYS = {
  ACCOUNTS: '@budget_ani_accounts',
  CATEGORIES: '@budget_ani_categories',
  TRANSACTIONS: '@budget_ani_transactions',
  CREDITS: '@budget_ani_credits',
  BUDGETS: '@budget_ani_budgets',
  RECURRING: '@budget_ani_recurring',
  INITIALIZED: '@budget_ani_initialized',
};

// Helper function to generate UUID
export const generateId = async () => {
  return await Crypto.randomUUID();
};

// Initialize database
export const initDatabase = async () => {
  try {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    
    if (!initialized) {
      // Initialize default categories
      await initDefaultCategories();
      await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      console.log('Database initialized with default categories');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

const initDefaultCategories = async () => {
  const defaultCategories = [
    { name: 'Wypłata', type: 'income', color: '#2C5F2D', icon: 'cash', is_default: true },
    { name: 'Premia', type: 'income', color: '#4CAF50', icon: 'gift', is_default: true },
    { name: 'Inwestycje', type: 'income', color: '#8BC34A', icon: 'trending-up', is_default: true },
    { name: 'Jedzenie', type: 'expense', color: '#800020', icon: 'restaurant', is_default: true },
    { name: 'Transport', type: 'expense', color: '#E91E63', icon: 'car', is_default: true },
    { name: 'Rachunki', type: 'expense', color: '#9C27B0', icon: 'receipt', is_default: true },
    { name: 'Rozrywka', type: 'expense', color: '#673AB7', icon: 'game-controller', is_default: true },
    { name: 'Zakupy', type: 'expense', color: '#3F51B5', icon: 'cart', is_default: true },
    { name: 'Zdrowie', type: 'expense', color: '#2196F3', icon: 'medkit', is_default: true },
    { name: 'Inne', type: 'expense', color: '#607D8B', icon: 'ellipsis-horizontal', is_default: true },
  ];
  
  const categoriesWithIds = await Promise.all(
    defaultCategories.map(async (cat) => ({
      ...cat,
      id: await generateId(),
      created_at: new Date().toISOString(),
    }))
  );
  
  await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categoriesWithIds));
};

// Generic storage helpers
const getItems = async (key: string) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting items from ${key}:`, error);
    return [];
  }
};

const setItems = async (key: string, items: any[]) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Error setting items to ${key}:`, error);
  }
};

// Accounts operations
export const accountsDB = {
  getAll: async () => {
    return await getItems(STORAGE_KEYS.ACCOUNTS);
  },
  
  getById: async (id: string) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    return accounts.find((acc: any) => acc.id === id);
  },
  
  create: async (account: any) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    const id = await generateId();
    const newAccount = {
      ...account,
      id,
      created_at: new Date().toISOString(),
    };
    accounts.push(newAccount);
    await setItems(STORAGE_KEYS.ACCOUNTS, accounts);
    return id;
  },
  
  update: async (id: string, account: any) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    const index = accounts.findIndex((acc: any) => acc.id === id);
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...account };
      await setItems(STORAGE_KEYS.ACCOUNTS, accounts);
    }
  },
  
  delete: async (id: string) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    const filtered = accounts.filter((acc: any) => acc.id !== id);
    await setItems(STORAGE_KEYS.ACCOUNTS, filtered);
  },
  
  updateBalance: async (id: string, newBalance: number) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    const index = accounts.findIndex((acc: any) => acc.id === id);
    if (index !== -1) {
      accounts[index].balance = newBalance;
      await setItems(STORAGE_KEYS.ACCOUNTS, accounts);
    }
  }
};

// Categories operations
export const categoriesDB = {
  getAll: async (type?: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    if (type) {
      return categories.filter((cat: any) => cat.type === type);
    }
    return categories;
  },
  
  create: async (category: any) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const id = await generateId();
    const newCategory = {
      ...category,
      id,
      is_default: false,
      created_at: new Date().toISOString(),
    };
    categories.push(newCategory);
    await setItems(STORAGE_KEYS.CATEGORIES, categories);
    return id;
  },
  
  update: async (id: string, category: any) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const index = categories.findIndex((cat: any) => cat.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...category };
      await setItems(STORAGE_KEYS.CATEGORIES, categories);
    }
  },
  
  delete: async (id: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const filtered = categories.filter((cat: any) => cat.id !== id && !cat.is_default);
    await setItems(STORAGE_KEYS.CATEGORIES, filtered);
  }
};

// Transactions operations
export const transactionsDB = {
  getAll: async (limit?: number, accountId?: string) => {
    let transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    
    if (accountId) {
      transactions = transactions.filter((t: any) => t.account_id === accountId);
    }
    
    // Sort by date descending
    transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (limit) {
      transactions = transactions.slice(0, limit);
    }
    
    return transactions;
  },
  
  getByDateRange: async (startDate: string, endDate: string, type?: string) => {
    let transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    
    transactions = transactions.filter((t: any) => {
      const tDate = new Date(t.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return tDate >= start && tDate <= end;
    });
    
    if (type) {
      transactions = transactions.filter((t: any) => t.type === type);
    }
    
    transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return transactions;
  },
  
  create: async (transaction: any) => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    const id = await generateId();
    
    const newTransaction = {
      ...transaction,
      id,
      created_at: new Date().toISOString(),
    };
    
    transactions.push(newTransaction);
    await setItems(STORAGE_KEYS.TRANSACTIONS, transactions);
    
    // Update account balance
    const account = await accountsDB.getById(transaction.account_id);
    if (account) {
      const newBalance = transaction.type === 'income'
        ? account.balance + transaction.amount
        : account.balance - transaction.amount;
      await accountsDB.updateBalance(transaction.account_id, newBalance);
    }
    
    return id;
  },
  
  delete: async (id: string) => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    const transaction = transactions.find((t: any) => t.id === id);
    
    if (transaction) {
      // Reverse balance change
      const account = await accountsDB.getById(transaction.account_id);
      if (account) {
        const newBalance = transaction.type === 'income'
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;
        await accountsDB.updateBalance(transaction.account_id, newBalance);
      }
      
      const filtered = transactions.filter((t: any) => t.id !== id);
      await setItems(STORAGE_KEYS.TRANSACTIONS, filtered);
    }
  }
};

// Credits operations
export const creditsDB = {
  getAll: async (month?: number, year?: number) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      
      const creditsWithPayments = await Promise.all(
        credits.map(async (credit: any) => {
          const transactions = await transactionsDB.getByDateRange(startDate, endDate, 'expense');
          const payments = transactions.filter((t: any) => t.credit_id === credit.id);
          const monthlyPaid = payments.reduce((sum: number, t: any) => sum + t.amount, 0);
          
          return {
            ...credit,
            monthly_paid: monthlyPaid,
          };
        })
      );
      
      return creditsWithPayments;
    }
    
    return credits;
  },
  
  create: async (credit: any) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const id = await generateId();
    const newCredit = {
      ...credit,
      id,
      created_at: new Date().toISOString(),
    };
    credits.push(newCredit);
    await setItems(STORAGE_KEYS.CREDITS, credits);
    return id;
  },
  
  update: async (id: string, credit: any) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const index = credits.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      credits[index] = { ...credits[index], ...credit };
      await setItems(STORAGE_KEYS.CREDITS, credits);
    }
  },
  
  delete: async (id: string) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const filtered = credits.filter((c: any) => c.id !== id);
    await setItems(STORAGE_KEYS.CREDITS, filtered);
  }
};

// Budgets operations
export const budgetsDB = {
  getAll: async (month?: number, year?: number) => {
    let budgets = await getItems(STORAGE_KEYS.BUDGETS);
    
    if (month && year) {
      budgets = budgets.filter((b: any) => b.month === month && b.year === year);
    }
    
    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget: any) => {
        const startDate = new Date(budget.year, budget.month - 1, 1).toISOString();
        const endDate = new Date(budget.year, budget.month, 0, 23, 59, 59).toISOString();
        
        const transactions = await transactionsDB.getByDateRange(startDate, endDate, 'expense');
        const categoryTransactions = transactions.filter((t: any) => t.category === budget.category);
        const spentAmount = categoryTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
        
        return {
          ...budget,
          spent_amount: spentAmount,
        };
      })
    );
    
    return budgetsWithSpent;
  },
  
  create: async (budget: any) => {
    const budgets = await getItems(STORAGE_KEYS.BUDGETS);
    const id = await generateId();
    const newBudget = {
      ...budget,
      id,
      spent_amount: 0,
      created_at: new Date().toISOString(),
    };
    budgets.push(newBudget);
    await setItems(STORAGE_KEYS.BUDGETS, budgets);
    return id;
  },
  
  update: async (id: string, budget: any) => {
    const budgets = await getItems(STORAGE_KEYS.BUDGETS);
    const index = budgets.findIndex((b: any) => b.id === id);
    if (index !== -1) {
      budgets[index] = { ...budgets[index], ...budget };
      await setItems(STORAGE_KEYS.BUDGETS, budgets);
    }
  },
  
  delete: async (id: string) => {
    const budgets = await getItems(STORAGE_KEYS.BUDGETS);
    const filtered = budgets.filter((b: any) => b.id !== id);
    await setItems(STORAGE_KEYS.BUDGETS, filtered);
  }
};

// Recurring transactions operations
export const recurringDB = {
  getAll: async () => {
    const items = await getItems(STORAGE_KEYS.RECURRING);
    // Calculate next_due_date for each item
    return items.map((item: any) => {
      const now = new Date();
      let nextDate = new Date(now.getFullYear(), now.getMonth(), item.day_of_month || 1);
      
      if (nextDate <= now) {
        if (item.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (item.frequency === 'quarterly') {
          nextDate.setMonth(nextDate.getMonth() + 3);
        } else if (item.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
      }
      
      return {
        ...item,
        next_due_date: nextDate.toISOString(),
      };
    });
  },
  
  create: async (recurring: any) => {
    const recurrings = await getItems(STORAGE_KEYS.RECURRING);
    const id = await generateId();
    const newRecurring = {
      ...recurring,
      id,
      is_active: true,
      last_executed: null,
      created_at: new Date().toISOString(),
    };
    recurrings.push(newRecurring);
    await setItems(STORAGE_KEYS.RECURRING, recurrings);
    return id;
  },
  
  execute: async (id: string) => {
    const recurrings = await getItems(STORAGE_KEYS.RECURRING);
    const recurring = recurrings.find((r: any) => r.id === id);
    
    if (recurring) {
      const transactionId = await transactionsDB.create({
        type: recurring.type,
        amount: recurring.amount,
        category: recurring.category,
        account_id: recurring.account_id,
        date: new Date().toISOString(),
        description: `Płatność cykliczna: ${recurring.name}`,
        credit_id: recurring.credit_id || null,
      });
      
      // Update last_executed
      const index = recurrings.findIndex((r: any) => r.id === id);
      if (index !== -1) {
        recurrings[index].last_executed = new Date().toISOString();
        await setItems(STORAGE_KEYS.RECURRING, recurrings);
      }
      
      return transactionId;
    }
  },
  
  update: async (id: string, recurring: any) => {
    const recurrings = await getItems(STORAGE_KEYS.RECURRING);
    const index = recurrings.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      recurrings[index] = { ...recurrings[index], ...recurring };
      await setItems(STORAGE_KEYS.RECURRING, recurrings);
    }
  },
  
  delete: async (id: string) => {
    const recurrings = await getItems(STORAGE_KEYS.RECURRING);
    const filtered = recurrings.filter((r: any) => r.id !== id);
    await setItems(STORAGE_KEYS.RECURRING, filtered);
  }
};

// Dashboard stats
export const getDashboardStats = async (month?: number, year?: number) => {
  const accounts = await accountsDB.getAll();
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
  
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();
  
  const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString();
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59).toISOString();
  
  const incomeTransactions = await transactionsDB.getByDateRange(startDate, endDate, 'income');
  const expenseTransactions = await transactionsDB.getByDateRange(startDate, endDate, 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  
  const credits = await creditsDB.getAll();
  
  return {
    total_balance: totalBalance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    accounts_count: accounts.length,
    credits_count: credits.length,
  };
};

export const getDatabase = () => {
  return { initialized: true };
};
