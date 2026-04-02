import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let db: SQLite.SQLiteDatabase | null = null;
let isWeb = Platform.OS === 'web';

// Web storage fallback using AsyncStorage
const webStorage = {
  accounts: [] as any[],
  categories: [] as any[],
  transactions: [] as any[],
  credits: [] as any[],
  budgets: [] as any[],
  recurring: [] as any[],
};

const loadWebData = async () => {
  if (!isWeb) return;
  
  try {
    const data = await AsyncStorage.getItem('budget_ani_data');
    if (data) {
      const parsed = JSON.parse(data);
      webStorage.accounts = parsed.accounts || [];
      webStorage.categories = parsed.categories || [];
      webStorage.transactions = parsed.transactions || [];
      webStorage.credits = parsed.credits || [];
      webStorage.budgets = parsed.budgets || [];
      webStorage.recurring = parsed.recurring || [];
    }
  } catch (error) {
    console.error('Error loading web data:', error);
  }
};

const saveWebData = async () => {
  if (!isWeb) return;
  
  try {
    await AsyncStorage.setItem('budget_ani_data', JSON.stringify(webStorage));
  } catch (error) {
    console.error('Error saving web data:', error);
  }
};

// Initialize database with encryption
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('budget_ani.db');
    
    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        currency TEXT DEFAULT 'PLN',
        icon TEXT DEFAULT 'wallet',
        color TEXT DEFAULT '#D4AF37',
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT DEFAULT 'pricetag',
        color TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        account_id TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        credit_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      
      CREATE TABLE IF NOT EXISTS credits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        interest_rate REAL NOT NULL,
        monthly_payment REAL NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        account_id TEXT,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        limit_amount REAL NOT NULL,
        spent_amount REAL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        account_id TEXT NOT NULL,
        frequency TEXT NOT NULL,
        day_of_month INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_active INTEGER DEFAULT 1,
        last_executed TEXT,
        credit_id TEXT,
        created_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_credit ON transactions(credit_id);
    `);
    
    // Initialize default categories if none exist
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
    if (result && (result as any).count === 0) {
      await initDefaultCategories();
    }
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

const initDefaultCategories = async () => {
  if (!db) return;
  
  const defaultCategories = [
    { name: 'Wypłata', type: 'income', color: '#2C5F2D' },
    { name: 'Premia', type: 'income', color: '#4CAF50' },
    { name: 'Inwestycje', type: 'income', color: '#8BC34A' },
    { name: 'Jedzenie', type: 'expense', color: '#800020' },
    { name: 'Transport', type: 'expense', color: '#E91E63' },
    { name: 'Rachunki', type: 'expense', color: '#9C27B0' },
    { name: 'Rozrywka', type: 'expense', color: '#673AB7' },
    { name: 'Zakupy', type: 'expense', color: '#3F51B5' },
    { name: 'Zdrowie', type: 'expense', color: '#2196F3' },
    { name: 'Inne', type: 'expense', color: '#607D8B' },
  ];
  
  for (const cat of defaultCategories) {
    const id = await Crypto.randomUUID();
    await db.runAsync(
      'INSERT INTO categories (id, name, type, icon, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, cat.name, cat.type, 'pricetag', cat.color, 1, new Date().toISOString()]
    );
  }
};

// Helper function to generate UUID
export const generateId = async () => {
  return await Crypto.randomUUID();
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

// Accounts operations
export const accountsDB = {
  getAll: async () => {
    const db = getDatabase();
    return await db.getAllAsync('SELECT * FROM accounts ORDER BY created_at DESC');
  },
  
  getById: async (id: string) => {
    const db = getDatabase();
    return await db.getFirstAsync('SELECT * FROM accounts WHERE id = ?', [id]);
  },
  
  create: async (account: any) => {
    const db = getDatabase();
    const id = await generateId();
    await db.runAsync(
      'INSERT INTO accounts (id, name, type, balance, currency, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, account.name, account.type, account.balance, account.currency, account.icon, account.color, new Date().toISOString()]
    );
    return id;
  },
  
  update: async (id: string, account: any) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ?, icon = ?, color = ? WHERE id = ?',
      [account.name, account.type, account.balance, account.currency, account.icon, account.color, id]
    );
  },
  
  delete: async (id: string) => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  },
  
  updateBalance: async (id: string, newBalance: number) => {
    const db = getDatabase();
    await db.runAsync('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, id]);
  }
};

// Categories operations
export const categoriesDB = {
  getAll: async (type?: string) => {
    const db = getDatabase();
    if (type) {
      return await db.getAllAsync('SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name ASC', [type]);
    }
    return await db.getAllAsync('SELECT * FROM categories ORDER BY type, is_default DESC, name ASC');
  },
  
  create: async (category: any) => {
    const db = getDatabase();
    const id = await generateId();
    await db.runAsync(
      'INSERT INTO categories (id, name, type, icon, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, category.name, category.type, category.icon, category.color, 0, new Date().toISOString()]
    );
    return id;
  },
  
  update: async (id: string, category: any) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE categories SET name = ?, type = ?, icon = ?, color = ? WHERE id = ?',
      [category.name, category.type, category.icon, category.color, id]
    );
  },
  
  delete: async (id: string) => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
  }
};

// Transactions operations
export const transactionsDB = {
  getAll: async (limit?: number, accountId?: string) => {
    const db = getDatabase();
    let query = 'SELECT * FROM transactions';
    const params: any[] = [];
    
    if (accountId) {
      query += ' WHERE account_id = ?';
      params.push(accountId);
    }
    
    query += ' ORDER BY date DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    return await db.getAllAsync(query, params);
  },
  
  getByDateRange: async (startDate: string, endDate: string, type?: string) => {
    const db = getDatabase();
    let query = 'SELECT * FROM transactions WHERE date >= ? AND date <= ?';
    const params: any[] = [startDate, endDate];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY date DESC';
    return await db.getAllAsync(query, params);
  },
  
  create: async (transaction: any) => {
    const db = getDatabase();
    const id = await generateId();
    
    await db.runAsync(
      'INSERT INTO transactions (id, type, amount, category, account_id, date, description, credit_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, transaction.type, transaction.amount, transaction.category, transaction.account_id, transaction.date, transaction.description || '', transaction.credit_id || null, new Date().toISOString()]
    );
    
    // Update account balance
    const account: any = await accountsDB.getById(transaction.account_id);
    if (account) {
      const newBalance = transaction.type === 'income' 
        ? account.balance + transaction.amount 
        : account.balance - transaction.amount;
      await accountsDB.updateBalance(transaction.account_id, newBalance);
    }
    
    return id;
  },
  
  delete: async (id: string) => {
    const db = getDatabase();
    const transaction: any = await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', [id]);
    
    if (transaction) {
      // Reverse balance change
      const account: any = await accountsDB.getById(transaction.account_id);
      if (account) {
        const newBalance = transaction.type === 'income'
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;
        await accountsDB.updateBalance(transaction.account_id, newBalance);
      }
      
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    }
  }
};

// Credits operations
export const creditsDB = {
  getAll: async (month?: number, year?: number) => {
    const db = getDatabase();
    const credits = await db.getAllAsync('SELECT * FROM credits ORDER BY created_at DESC');
    
    if (month && year) {
      // Calculate monthly payments for each credit
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      
      const creditsWithPayments = await Promise.all(credits.map(async (credit: any) => {
        const payments = await db.getAllAsync(
          'SELECT SUM(amount) as total FROM transactions WHERE credit_id = ? AND type = ? AND date >= ? AND date <= ?',
          [credit.id, 'expense', startDate, endDate]
        );
        
        return {
          ...credit,
          monthly_paid: (payments[0] as any)?.total || 0
        };
      }));
      
      return creditsWithPayments;
    }
    
    return credits;
  },
  
  create: async (credit: any) => {
    const db = getDatabase();
    const id = await generateId();
    await db.runAsync(
      'INSERT INTO credits (id, name, total_amount, remaining_amount, interest_rate, monthly_payment, start_date, end_date, account_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, credit.name, credit.total_amount, credit.remaining_amount, credit.interest_rate, credit.monthly_payment, credit.start_date, credit.end_date, credit.account_id || null, new Date().toISOString()]
    );
    return id;
  },
  
  update: async (id: string, credit: any) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE credits SET name = ?, total_amount = ?, remaining_amount = ?, interest_rate = ?, monthly_payment = ?, start_date = ?, end_date = ?, account_id = ? WHERE id = ?',
      [credit.name, credit.total_amount, credit.remaining_amount, credit.interest_rate, credit.monthly_payment, credit.start_date, credit.end_date, credit.account_id || null, id]
    );
  },
  
  delete: async (id: string) => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM credits WHERE id = ?', [id]);
  }
};

// Budgets operations
export const budgetsDB = {
  getAll: async (month?: number, year?: number) => {
    const db = getDatabase();
    let query = 'SELECT * FROM budgets';
    const params: any[] = [];
    
    if (month && year) {
      query += ' WHERE month = ? AND year = ?';
      params.push(month, year);
    }
    
    query += ' ORDER BY created_at DESC';
    const budgets = await db.getAllAsync(query, params);
    
    // Calculate spent amount for each budget
    return await Promise.all(budgets.map(async (budget: any) => {
      const startDate = new Date(budget.year, budget.month - 1, 1).toISOString();
      const endDate = new Date(budget.year, budget.month, 0, 23, 59, 59).toISOString();
      
      const spent = await db.getAllAsync(
        'SELECT SUM(amount) as total FROM transactions WHERE type = ? AND category = ? AND date >= ? AND date <= ?',
        ['expense', budget.category, startDate, endDate]
      );
      
      return {
        ...budget,
        spent_amount: (spent[0] as any)?.total || 0
      };
    }));
  },
  
  create: async (budget: any) => {
    const db = getDatabase();
    const id = await generateId();
    await db.runAsync(
      'INSERT INTO budgets (id, category, month, year, limit_amount, spent_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, budget.category, budget.month, budget.year, budget.limit_amount, 0, new Date().toISOString()]
    );
    return id;
  },
  
  update: async (id: string, budget: any) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE budgets SET category = ?, month = ?, year = ?, limit_amount = ? WHERE id = ?',
      [budget.category, budget.month, budget.year, budget.limit_amount, id]
    );
  },
  
  delete: async (id: string) => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
  }
};

// Recurring transactions operations
export const recurringDB = {
  getAll: async () => {
    const db = getDatabase();
    return await db.getAllAsync('SELECT * FROM recurring_transactions ORDER BY created_at DESC');
  },
  
  create: async (recurring: any) => {
    const db = getDatabase();
    const id = await generateId();
    await db.runAsync(
      'INSERT INTO recurring_transactions (id, name, type, amount, category, account_id, frequency, day_of_month, start_date, end_date, is_active, last_executed, credit_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, recurring.name, recurring.type, recurring.amount, recurring.category, recurring.account_id, recurring.frequency, recurring.day_of_month, recurring.start_date, recurring.end_date || null, 1, null, recurring.credit_id || null, new Date().toISOString()]
    );
    return id;
  },
  
  execute: async (id: string) => {
    const db = getDatabase();
    const recurring: any = await db.getFirstAsync('SELECT * FROM recurring_transactions WHERE id = ?', [id]);
    
    if (recurring) {
      const transactionId = await transactionsDB.create({
        type: recurring.type,
        amount: recurring.amount,
        category: recurring.category,
        account_id: recurring.account_id,
        date: new Date().toISOString(),
        description: `Płatność cykliczna: ${recurring.name}`,
        credit_id: recurring.credit_id
      });
      
      await db.runAsync(
        'UPDATE recurring_transactions SET last_executed = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
      
      return transactionId;
    }
  },
  
  update: async (id: string, recurring: any) => {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE recurring_transactions SET name = ?, type = ?, amount = ?, category = ?, account_id = ?, frequency = ?, day_of_month = ?, start_date = ?, end_date = ?, credit_id = ? WHERE id = ?',
      [recurring.name, recurring.type, recurring.amount, recurring.category, recurring.account_id, recurring.frequency, recurring.day_of_month, recurring.start_date, recurring.end_date || null, recurring.credit_id || null, id]
    );
  },
  
  delete: async (id: string) => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
  }
};

// Dashboard stats
export const getDashboardStats = async (month?: number, year?: number) => {
  const db = getDatabase();
  
  // Get all accounts
  const accounts = await accountsDB.getAll();
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
  
  // Get transactions for period
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
    credits_count: credits.length
  };
};
