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
  SAVINGS_GOALS: '@budget_ani_savings_goals',
  PIN_CODE: '@budget_ani_pin',
  DARK_MODE: '@budget_ani_dark_mode',
  INITIALIZED: '@budget_ani_initialized',
  PLANS: '@budget_ani_plans',
  INVESTMENTS: '@budzetani_investments',
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

    // Runs the credit balance migration before any new payment can be recorded
    await creditsDB.getAll();

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
    { name: 'Przelew', type: 'expense', color: '#2196F3', icon: 'swap-horizontal', is_default: true },
    { name: 'Przelew', type: 'income', color: '#2196F3', icon: 'swap-horizontal', is_default: true },
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

// Rounds money to whole grosze so floating point errors don't accumulate in stored balances
export const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

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
      if (typeof accounts[index].balance === 'number') accounts[index].balance = round2(accounts[index].balance);
      await setItems(STORAGE_KEYS.ACCOUNTS, accounts);
    }
  },

  delete: async (id: string) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    const filtered = accounts.filter((acc: any) => acc.id !== id);
    await setItems(STORAGE_KEYS.ACCOUNTS, filtered);
  },

  countTransactions: async (id: string) => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    return transactions.filter((t: any) => t.account_id === id).length;
  },

  // Deletes the account and its transactions; each deletion reverses its side effects (transfer pairs, plan links)
  deleteWithTransactions: async (id: string) => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    for (const t of transactions.filter((t: any) => t.account_id === id)) {
      await transactionsDB.delete(t.id);
    }
    await accountsDB.delete(id);
  },

  updateBalance: async (id: string, newBalance: number) => {
    const accounts = await getItems(STORAGE_KEYS.ACCOUNTS);
    const index = accounts.findIndex((acc: any) => acc.id === id);
    if (index !== -1) {
      accounts[index].balance = round2(newBalance);
      await setItems(STORAGE_KEYS.ACCOUNTS, accounts);
    }
  }
};

// Names the app relies on in code (transfers, delete fallback) - they can't be renamed
export const LOCKED_CATEGORY_NAMES = ['Przelew', 'Inne'];

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
      const old = categories[index];
      categories[index] = { ...old, ...category };
      await setItems(STORAGE_KEYS.CATEGORIES, categories);

      // Records reference categories by name, so carry a rename over to them
      const newName = categories[index].name;
      if (newName && newName !== old.name) {
        const type = old.type;
        const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
        transactions.forEach((t: any) => { if (t.category === old.name && t.type === type) t.category = newName; });
        await setItems(STORAGE_KEYS.TRANSACTIONS, transactions);

        const recurrings = await getItems(STORAGE_KEYS.RECURRING);
        recurrings.forEach((r: any) => { if (r.category === old.name && r.type === type) r.category = newName; });
        await setItems(STORAGE_KEYS.RECURRING, recurrings);

        if (type === 'expense') {
          const budgets = await getItems(STORAGE_KEYS.BUDGETS);
          budgets.forEach((b: any) => {
            if (b.category === old.name) b.category = newName;
            if (Array.isArray(b.categories)) b.categories = b.categories.map((c: string) => (c === old.name ? newName : c));
          });
          await setItems(STORAGE_KEYS.BUDGETS, budgets);
        }
      }
    }
  },
  
  getById: async (id: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    return categories.find((c: any) => c.id === id) || null;
  },

  // Map of "type|name" -> number of transactions, for showing usage in the list
  getUsageCounts: async () => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    const counts: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const key = `${t.type}|${t.category}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  },

  countTransactions: async (name: string, type: string) => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    return transactions.filter((t: any) => t.category === name && t.type === type).length;
  },

  // Deletes a non-default category and moves its transactions and recurring payments to "Inne"
  delete: async (id: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const cat = categories.find((c: any) => c.id === id);
    if (!cat || cat.is_default) return;

    const fallbackName = 'Inne';
    const remaining = categories.filter((c: any) => c.id !== id);
    if (!remaining.some((c: any) => c.name === fallbackName && c.type === cat.type)) {
      remaining.push({ id: await generateId(), name: fallbackName, type: cat.type, color: '#607D8B', icon: 'ellipsis-horizontal', is_default: true, created_at: new Date().toISOString() });
    }
    await setItems(STORAGE_KEYS.CATEGORIES, remaining);

    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    transactions.forEach((t: any) => {
      if (t.category === cat.name && t.type === cat.type) { t.category = fallbackName; t.subcategory = null; }
    });
    await setItems(STORAGE_KEYS.TRANSACTIONS, transactions);

    const recurrings = await getItems(STORAGE_KEYS.RECURRING);
    recurrings.forEach((r: any) => { if (r.category === cat.name && r.type === cat.type) r.category = fallbackName; });
    await setItems(STORAGE_KEYS.RECURRING, recurrings);

    if (cat.type === 'expense') {
      const budgets = await getItems(STORAGE_KEYS.BUDGETS);
      budgets.forEach((b: any) => {
        if (Array.isArray(b.categories)) b.categories = b.categories.filter((c: string) => c !== cat.name);
      });
      await setItems(STORAGE_KEYS.BUDGETS, budgets);
    }
  },
  
  addSubcategory: async (categoryId: string, name: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const index = categories.findIndex((c: any) => c.id === categoryId);
    if (index !== -1) {
      if (!categories[index].subcategories) categories[index].subcategories = [];
      const id = await generateId();
      categories[index].subcategories.push({ id, name });
      await setItems(STORAGE_KEYS.CATEGORIES, categories);
      return id;
    }
  },
  
  updateSubcategory: async (categoryId: string, subId: string, newName: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const index = categories.findIndex((c: any) => c.id === categoryId);
    if (index !== -1 && categories[index].subcategories) {
      const cat = categories[index];
      const sub = cat.subcategories.find((s: any) => s.id === subId);
      if (sub) {
        const oldName = sub.name;
        sub.name = newName;
        await setItems(STORAGE_KEYS.CATEGORIES, categories);

        // Transactions store the subcategory by name, so carry the rename over
        if (oldName !== newName) {
          const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
          transactions.forEach((t: any) => {
            if (t.category === cat.name && t.type === cat.type && t.subcategory === oldName) t.subcategory = newName;
          });
          await setItems(STORAGE_KEYS.TRANSACTIONS, transactions);
        }
      }
    }
  },
  
  deleteSubcategory: async (categoryId: string, subId: string) => {
    const categories = await getItems(STORAGE_KEYS.CATEGORIES);
    const index = categories.findIndex((c: any) => c.id === categoryId);
    if (index !== -1 && categories[index].subcategories) {
      categories[index].subcategories = categories[index].subcategories.filter((s: any) => s.id !== subId);
      await setItems(STORAGE_KEYS.CATEGORIES, categories);
    }
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

    await plansDB.linkTransaction(newTransaction);

    return id;
  },
  
  // Returns the removed records (both legs for a transfer) so the deletion can be undone with restore()
  delete: async (id: string): Promise<any[]> => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    const transaction = transactions.find((t: any) => t.id === id);
    const removed: any[] = [];

    if (transaction) {
      removed.push(transaction);
      // Reverse balance change
      const account = await accountsDB.getById(transaction.account_id);
      if (account) {
        const newBalance = transaction.type === 'income'
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;
        await accountsDB.updateBalance(transaction.account_id, newBalance);
      }
      
      // Credit balances are derived from transactions (see creditsDB), so nothing to restore there
      const filtered = transactions.filter((t: any) => t.id !== id);
      await setItems(STORAGE_KEYS.TRANSACTIONS, filtered);
      await plansDB.unlinkTransaction(id);

      // Delete the other leg of a transfer too, otherwise one account keeps the money moved
      if (transaction.transfer_id) {
        const pair = filtered.find((t: any) => t.transfer_id === transaction.transfer_id);
        if (pair) removed.push(...await transactionsDB.delete(pair.id));
      }
    }
    return removed;
  },

  // Puts back records returned by delete(), with their original ids, and re-applies account balances
  restore: async (records: any[]) => {
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    const existingIds = new Set(transactions.map((t: any) => t.id));
    const toRestore = records.filter((r: any) => !existingIds.has(r.id));
    if (toRestore.length === 0) return;
    await setItems(STORAGE_KEYS.TRANSACTIONS, [...transactions, ...toRestore]);

    for (const t of toRestore) {
      const account = await accountsDB.getById(t.account_id);
      if (account) {
        const newBalance = t.type === 'income' ? account.balance + t.amount : account.balance - t.amount;
        await accountsDB.updateBalance(t.account_id, newBalance);
      }
      await plansDB.linkTransaction(t);
    }
  }
};

// Credits operations
//
// The amount left to repay is not stored and adjusted step by step (that drifted every time a
// payment was edited or deleted). Instead each credit keeps `principal_base` and the balance is
//   remaining_amount = principal_base - sum(capital_part of all transactions linked to the credit)
// so adding, editing or deleting a payment is reflected automatically.

const sumCapitalPaid = (creditId: string, transactions: any[]) =>
  round2(transactions
    .filter((t: any) => t.credit_id === creditId)
    .reduce((sum: number, t: any) => sum + (t.capital_part || 0), 0));

// One-time migration: credits saved before principal_base existed keep their current balance
const ensurePrincipalBase = async (credits: any[], transactions: any[]) => {
  let changed = false;
  credits.forEach((c: any) => {
    if (typeof c.principal_base !== 'number') {
      c.principal_base = round2((c.remaining_amount || 0) + sumCapitalPaid(c.id, transactions));
      changed = true;
    }
  });
  if (changed) await setItems(STORAGE_KEYS.CREDITS, credits);
};

const withRemaining = (credit: any, transactions: any[]) => ({
  ...credit,
  remaining_amount: Math.max(0, round2(credit.principal_base - sumCapitalPaid(credit.id, transactions))),
});

export const creditsDB = {
  getAll: async (month?: number, year?: number) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
    await ensurePrincipalBase(credits, transactions);

    let result = credits.map((c: any) => withRemaining(c, transactions));

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const inMonth = transactions.filter((t: any) => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= start && d <= end;
      });
      result = result.map((credit: any) => ({
        ...credit,
        monthly_paid: sumCapitalPaid(credit.id, inMonth),
      }));
    }

    return result;
  },

  create: async (credit: any) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const id = await generateId();
    const newCredit = {
      ...credit,
      id,
      principal_base: round2(credit.remaining_amount || 0),
      created_at: new Date().toISOString(),
    };
    credits.push(newCredit);
    await setItems(STORAGE_KEYS.CREDITS, credits);
    return id;
  },

  // Passing remaining_amount sets the balance as of now (payments made so far are kept in the history)
  update: async (id: string, credit: any) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const index = credits.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      credits[index] = { ...credits[index], ...credit };
      if (credit.remaining_amount !== undefined) {
        const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
        credits[index].principal_base = round2((credit.remaining_amount || 0) + sumCapitalPaid(id, transactions));
      }
      await setItems(STORAGE_KEYS.CREDITS, credits);
    }
  },

  delete: async (id: string) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const filtered = credits.filter((c: any) => c.id !== id);
    await setItems(STORAGE_KEYS.CREDITS, filtered);
  },

  markAsPaid: async (id: string) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const index = credits.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      credits[index].status = 'paid';
      credits[index].paid_date = new Date().toISOString();
      await setItems(STORAGE_KEYS.CREDITS, credits);
    }
  },

  restoreActive: async (id: string) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const index = credits.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      credits[index].status = 'active';
      delete credits[index].paid_date;
      await setItems(STORAGE_KEYS.CREDITS, credits);
    }
  },

  // Records overpayment info and new rates. The overpayment itself must be saved as a transaction
  // with capital_part = amount; that transaction is what lowers the balance.
  overpay: async (id: string, amount: number, rateInfo?: { first_rate?: number; regular_rate?: number; last_rate?: number; monthly_payment?: number }) => {
    const credits = await getItems(STORAGE_KEYS.CREDITS);
    const index = credits.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      if (rateInfo) {
        if (rateInfo.monthly_payment !== undefined) credits[index].monthly_payment = rateInfo.monthly_payment;
        if (rateInfo.first_rate !== undefined) credits[index].first_rate_after_overpay = rateInfo.first_rate;
        if (rateInfo.last_rate !== undefined) credits[index].last_rate = rateInfo.last_rate;
      }
      if (amount > 0) {
        credits[index].last_overpay_date = new Date().toISOString();
        credits[index].last_overpay_amount = amount;
      }
      await setItems(STORAGE_KEYS.CREDITS, credits);
    }
  },
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
        const budgetCategories = budget.categories || [budget.category];
        const categoryTransactions = transactions.filter((t: any) => budgetCategories.includes(t.category));
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

const FREQUENCY_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

// Next `count` due dates (at 9:00 local) of a recurring item, after `from`.
// Periods are counted from start_date's month; a period already executed is skipped.
// day_of_month is clamped to the month's length (31 → 30 Apr, 28/29 Feb).
export const getNextDueDates = (item: any, count = 1, from: Date = new Date()) => {
  const step = FREQUENCY_MONTHS[item.frequency] || 1;
  const start = item.start_date ? new Date(item.start_date) : from;
  const anchor = start.getFullYear() * 12 + start.getMonth();
  const lastExec = item.last_executed ? new Date(item.last_executed) : null;
  const lastExecIdx = lastExec ? lastExec.getFullYear() * 12 + lastExec.getMonth() : -Infinity;

  const result: Date[] = [];
  let idx = from.getFullYear() * 12 + from.getMonth();
  for (let guard = 0; result.length < count && guard < 600; guard++, idx++) {
    if (((idx - anchor) % step + step) % step !== 0) continue;
    // Executed in this due month (or later) means this period is done
    if (lastExecIdx >= idx) continue;
    const y = Math.floor(idx / 12), m = idx % 12;
    const day = Math.min(item.day_of_month || 1, new Date(y, m + 1, 0).getDate());
    const due = new Date(y, m, day, 9, 0, 0);
    if (due <= from) continue;
    result.push(due);
  }
  return result;
};

export const recurringDB = {
  getAll: async () => {
    const items = await getItems(STORAGE_KEYS.RECURRING);
    return items.map((item: any) => {
      const [next] = getNextDueDates(item, 1);
      return { ...item, next_due_date: next ? next.toISOString() : null };
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
      const txAmount = recurring.amount || 0;
      let txCapitalPart = recurring.capital_part || null;
      let txInterestPart = recurring.interest_part || null;
      // Without an explicit split, estimate interest from remaining balance so only capital reduces the debt
      if (recurring.credit_id && txCapitalPart === null) {
        const credits = await creditsDB.getAll();
        const credit = credits.find((c: any) => c.id === recurring.credit_id);
        const interest = credit
          ? Math.min(txAmount, (credit.remaining_amount || 0) * (credit.interest_rate || 0) / 100 / 12)
          : 0;
        txInterestPart = parseFloat(interest.toFixed(2));
        txCapitalPart = parseFloat((txAmount - txInterestPart).toFixed(2));
      }

      const transactionId = await transactionsDB.create({
        type: recurring.type,
        amount: txAmount,
        category: recurring.category,
        account_id: recurring.account_id,
        date: new Date().toISOString(),
        description: `Płatność cykliczna: ${recurring.name}`,
        credit_id: recurring.credit_id || null,
        capital_part: txCapitalPart,
        interest_part: txInterestPart,
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
  },
  
  deactivateByCreditId: async (creditId: string) => {
    const recurrings = await getItems(STORAGE_KEYS.RECURRING);
    let changed = false;
    recurrings.forEach((r: any) => {
      if (r.credit_id === creditId && r.is_active) {
        r.is_active = false;
        changed = true;
      }
    });
    if (changed) {
      await setItems(STORAGE_KEYS.RECURRING, recurrings);
    }
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
  
  // Exclude transfers and limit refunds from stats
  const totalIncome = incomeTransactions.filter((t: any) => !t.is_transfer && !t.is_limit_refund).reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.filter((t: any) => !t.is_transfer).reduce((sum: number, t: any) => sum + t.amount, 0);
  
  const credits = await creditsDB.getAll();
  const activeCredits = credits.filter((c: any) => c.status !== 'paid');

  return {
    total_balance: totalBalance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    accounts_count: accounts.length,
    credits_count: activeCredits.length,
  };
};

// Savings Goals
export const savingsGoalsDB = {
  getAll: async () => {
    return await getItems(STORAGE_KEYS.SAVINGS_GOALS);
  },
  create: async (goal: any) => {
    const goals = await getItems(STORAGE_KEYS.SAVINGS_GOALS);
    const id = await generateId();
    goals.push({ ...goal, id, current_amount: goal.current_amount || 0, created_at: new Date().toISOString() });
    await setItems(STORAGE_KEYS.SAVINGS_GOALS, goals);
    return id;
  },
  update: async (id: string, goal: any) => {
    const goals = await getItems(STORAGE_KEYS.SAVINGS_GOALS);
    const index = goals.findIndex((g: any) => g.id === id);
    if (index !== -1) { goals[index] = { ...goals[index], ...goal }; await setItems(STORAGE_KEYS.SAVINGS_GOALS, goals); }
  },
  addAmount: async (id: string, amount: number) => {
    const goals = await getItems(STORAGE_KEYS.SAVINGS_GOALS);
    const index = goals.findIndex((g: any) => g.id === id);
    if (index !== -1) { goals[index].current_amount = (goals[index].current_amount || 0) + amount; await setItems(STORAGE_KEYS.SAVINGS_GOALS, goals); }
  },
  delete: async (id: string) => {
    const goals = await getItems(STORAGE_KEYS.SAVINGS_GOALS);
    await setItems(STORAGE_KEYS.SAVINGS_GOALS, goals.filter((g: any) => g.id !== id));
  },
};

// Investments
export const investmentsDB = {
  getAll: async () => {
    return await getItems(STORAGE_KEYS.INVESTMENTS);
  },
  create: async (investment: any) => {
    const items = await getItems(STORAGE_KEYS.INVESTMENTS);
    const id = await generateId();
    items.push({ ...investment, id, payments: investment.payments || [], created_at: new Date().toISOString() });
    await setItems(STORAGE_KEYS.INVESTMENTS, items);
    return id;
  },
  update: async (id: string, data: any) => {
    const items = await getItems(STORAGE_KEYS.INVESTMENTS);
    const index = items.findIndex((i: any) => i.id === id);
    if (index !== -1) { items[index] = { ...items[index], ...data }; await setItems(STORAGE_KEYS.INVESTMENTS, items); }
  },
  delete: async (id: string) => {
    const items = await getItems(STORAGE_KEYS.INVESTMENTS);
    await setItems(STORAGE_KEYS.INVESTMENTS, items.filter((i: any) => i.id !== id));
  },
  addPayment: async (id: string, payment: any) => {
    const items = await getItems(STORAGE_KEYS.INVESTMENTS);
    const index = items.findIndex((i: any) => i.id === id);
    if (index !== -1) {
      if (!items[index].payments) items[index].payments = [];
      const paymentId = await generateId();
      items[index].payments.push({ ...payment, id: paymentId });
      items[index].total_paid = (items[index].payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      await setItems(STORAGE_KEYS.INVESTMENTS, items);
      return paymentId;
    }
  },
  removePayment: async (investmentId: string, paymentId: string) => {
    const items = await getItems(STORAGE_KEYS.INVESTMENTS);
    const index = items.findIndex((i: any) => i.id === investmentId);
    if (index !== -1 && items[index].payments) {
      items[index].payments = items[index].payments.filter((p: any) => p.id !== paymentId);
      items[index].total_paid = items[index].payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      await setItems(STORAGE_KEYS.INVESTMENTS, items);
    }
  },
  updateValue: async (id: string, currentValue: number) => {
    const items = await getItems(STORAGE_KEYS.INVESTMENTS);
    const index = items.findIndex((i: any) => i.id === id);
    if (index !== -1) { items[index].current_value = currentValue; items[index].value_updated_at = new Date().toISOString(); await setItems(STORAGE_KEYS.INVESTMENTS, items); }
  },
};

// User Settings (birth year etc.)
export const getLastAccountForCategory = async (category: string): Promise<string | null> => {
  try {
    const all = await getItems(STORAGE_KEYS.TRANSACTIONS);
    const matching = all.filter((t: any) => t.category === category && t.account_id).sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    return matching.length > 0 ? matching[0].account_id : null;
  } catch { return null; }
};

export const userSettingsDB = {
  get: async (key: string) => {
    try { const val = await AsyncStorage.getItem(`@budzetani_setting_${key}`); return val; } catch { return null; }
  },
  set: async (key: string, value: string) => {
    try { await AsyncStorage.setItem(`@budzetani_setting_${key}`, value); } catch {}
  },
  getCustomLimits: async (year: number): Promise<{ike: number; ikze_etat: number; ikze_dg: number} | null> => {
    try { const val = await AsyncStorage.getItem(`@budzetani_ike_ikze_limits_${year}`); return val ? JSON.parse(val) : null; } catch { return null; }
  },
  setCustomLimits: async (year: number, limits: {ike: number; ikze_etat: number; ikze_dg: number}): Promise<void> => {
    try { await AsyncStorage.setItem(`@budzetani_ike_ikze_limits_${year}`, JSON.stringify(limits)); } catch {}
  },
};

// PIN Management

// Transaction update
export const transactionUpdate = async (id: string, updates: any, syncTransferPair = true) => {
  const transactions = await getItems(STORAGE_KEYS.TRANSACTIONS);
  const index = transactions.findIndex((t: any) => t.id === id);
  if (index !== -1) {
    const old = transactions[index];

    // Reverse old account balance
    const account = await accountsDB.getById(old.account_id);
    if (account) {
      const reversed = old.type === 'income' ? account.balance - old.amount : account.balance + old.amount;
      await accountsDB.updateBalance(old.account_id, reversed);
    }

    // Apply new transaction data (credit balances are derived from transactions, nothing else to adjust)
    const updated = { ...old, ...updates };
    transactions[index] = updated;
    await setItems(STORAGE_KEYS.TRANSACTIONS, transactions);

    // Apply new account balance
    const newAcc = await accountsDB.getById(updated.account_id);
    if (newAcc) {
      const newBal = updated.type === 'income' ? newAcc.balance + updated.amount : newAcc.balance - updated.amount;
      await accountsDB.updateBalance(updated.account_id, newBal);
    }

    // The date may have moved the transaction to another month's plan
    await plansDB.unlinkTransaction(id);
    await plansDB.linkTransaction(updated);

    // Keep both legs of a transfer in sync
    if (syncTransferPair && old.transfer_id && (updated.amount !== old.amount || updated.date !== old.date)) {
      const pair = transactions.find((t: any) => t.transfer_id === old.transfer_id && t.id !== id);
      if (pair) await transactionUpdate(pair.id, { amount: updated.amount, date: updated.date }, false);
    }
  }
};

// Statistics
export const getStatistics = async (month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
  const allTransactions = await transactionsDB.getByDateRange(startDate, endDate);

  // Exclude transfers from statistics
  const nonTransferTransactions = allTransactions.filter((t: any) => !t.is_transfer);
  // Also exclude limit refunds from income stats
  const statsTransactions = nonTransferTransactions.filter((t: any) => !(t.type === 'income' && t.is_limit_refund));

  const byCategory: Record<string, { amount: number; type: string }> = {};
  statsTransactions.forEach((t: any) => {
    if (!byCategory[t.category]) byCategory[t.category] = { amount: 0, type: t.type };
    byCategory[t.category].amount += t.amount;
  });

  // Monthly trends (last 6 months)
  const trends = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const ms = d.toISOString();
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const mt = await transactionsDB.getByDateRange(ms, me);
    const nonTransfer = mt.filter((t: any) => !t.is_transfer);
    const inc = nonTransfer.filter((t: any) => t.type === 'income' && !t.is_limit_refund).reduce((s: number, t: any) => s + t.amount, 0);
    const exp = nonTransfer.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
    trends.push({ month: d.getMonth() + 1, year: d.getFullYear(), income: inc, expenses: exp, label: d.toLocaleDateString('pl-PL', { month: 'short' }) });
  }

  return { byCategory, trends, totalIncome: statsTransactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0), totalExpenses: statsTransactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0) };
};

// Export to CSV
export const exportToCSV = async () => {
  const transactions = await transactionsDB.getAll(9999);
  const accounts = await accountsDB.getAll();
  const credits = await creditsDB.getAll();

  let csv = 'Typ,Kategoria,Kwota,Data,Opis,Konto\n';
  transactions.forEach((t: any) => {
    const acc = accounts.find((a: any) => a.id === t.account_id);
    csv += `${t.type === 'income' ? 'Przychód' : 'Wydatek'},"${t.category}",${t.amount},${t.date},"${t.description || ''}","${acc?.name || ''}"\n`;
  });

  csv += '\n\nKonta\nNazwa,Typ,Saldo\n';
  accounts.forEach((a: any) => { csv += `"${a.name}","${a.type}",${a.balance}\n`; });

  csv += '\n\nKredyty\nNazwa,Kwota całkowita,Do spłaty,Rata,Oprocentowanie\n';
  credits.forEach((c: any) => { csv += `"${c.name}",${c.total_amount},${c.remaining_amount},${c.monthly_payment},${c.interest_rate}%\n`; });

  return csv;
};

export const getDatabase = () => {
  return { initialized: true };
};

// Full Backup Export
export const exportFullBackup = async () => {
  const data: Record<string, any> = {};
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    if (key === 'PIN_CODE' || key === 'DARK_MODE' || key === 'INITIALIZED') continue;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) data[key] = JSON.parse(raw);
    } catch (e) {
      // Skip items that can't be parsed
    }
  }
  return JSON.stringify(data, null, 2);
};

// Full Backup Import
export const importFullBackup = async (jsonString: string, mode: 'overwrite' | 'append') => {
  const data = JSON.parse(jsonString);
  
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    if (key === 'PIN_CODE' || key === 'DARK_MODE' || key === 'INITIALIZED') continue;
    if (!data[key]) continue;
    
    if (mode === 'overwrite') {
      await AsyncStorage.setItem(storageKey, JSON.stringify(data[key]));
    } else {
      // Append mode - merge arrays
      const existing = await AsyncStorage.getItem(storageKey);
      const existingData = existing ? JSON.parse(existing) : [];
      if (Array.isArray(existingData) && Array.isArray(data[key])) {
        const existingIds = new Set(existingData.map((item: any) => item.id));
        const newItems = data[key].filter((item: any) => !existingIds.has(item.id));
        await AsyncStorage.setItem(storageKey, JSON.stringify([...existingData, ...newItems]));
      }
    }
  }
};

// ========== PLANS (Monthly Budget Planning) ==========
const FUTURE_PLAN_MONTHS = 12;

// Strips prefixes the app adds to descriptions so "Rata kredytu: X", "Płatność cykliczna: X" and "Rata: X" all match "x"
const normalizePlanName = (s?: string | null) =>
  (s || '').trim().toLowerCase().replace(/^(płatność cykliczna|rata kredytu|rata)\s*:\s*/, '').trim();
const planIndex = (p: any) => p.month + p.year * 12;

// Copies recurring items into `plan` from the most recent earlier plan that has them.
// excluded_recurring_names skips an item in that month only; stopped_recurring_names stops it from that month onward.
// Mutates `plan`; returns true if anything was added.
const applyRecurringToPlan = async (all: any[], plan: any) => {
  const target = planIndex(plan);
  const prevPlans = all
    .filter((p: any) => planIndex(p) < target)
    .sort((a: any, b: any) => planIndex(b) - planIndex(a));

  const processedKeys = new Set<string>();
  let added = false;

  for (const prev of prevPlans) {
    const prevNum = planIndex(prev);
    for (const type of ['incomes', 'expenses'] as const) {
      for (const item of prev[type] || []) {
        const key = `${type}:${item.name}`;
        if (processedKeys.has(key)) continue; // newest occurrence decides
        processedKeys.add(key);
        if (!item.is_recurring) continue;

        const freq = item.frequency || 1;
        if ((target - prevNum) % freq !== 0) continue;

        const list = plan[type] || [];
        if (list.some((e: any) => e.name === item.name)) continue;
        if ((plan.excluded_recurring_names || []).includes(item.name)) continue;
        const stopped = all.some((p: any) => {
          const n = planIndex(p);
          return n > prevNum && n <= target && (p.stopped_recurring_names || []).includes(item.name);
        });
        if (stopped) continue;

        list.push({ id: await generateId(), name: item.name, amount: item.amount, day: item.day, is_recurring: true, frequency: freq, paid: false });
        plan[type] = list;
        added = true;
      }
    }
  }
  return added;
};

export const plansDB = {
  getAll: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PLANS);
    return raw ? JSON.parse(raw) : [];
  },

  getByMonth: async (month: number, year: number) => {
    const all = await plansDB.getAll();
    return all.find((p: any) => p.month === month && p.year === year) || null;
  },

  save: async (plan: any) => {
    const all = await plansDB.getAll();
    const idx = all.findIndex((p: any) => p.id === plan.id);
    if (idx >= 0) {
      all[idx] = plan;
    } else {
      all.push(plan);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return plan;
  },

  createForMonth: async (month: number, year: number) => {
    const existing = await plansDB.getByMonth(month, year);
    if (existing) return existing;
    const plan = {
      id: await generateId(),
      month,
      year,
      incomes: [],
      expenses: [],
      created_at: new Date().toISOString(),
    };
    const all = await plansDB.getAll();
    all.push(plan);
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return plan;
  },

  addItem: async (planId: string, type: 'income' | 'expense', item: any) => {
    const all = await plansDB.getAll();
    const plan = all.find((p: any) => p.id === planId);
    if (!plan) return;
    const newItem = { ...item, id: await generateId(), paid: false };
    if (type === 'income') {
      plan.incomes.push(newItem);
    } else {
      plan.expenses.push(newItem);
    }
    // Re-adding an item lifts earlier exclusions of that name in this month
    plan.excluded_recurring_names = (plan.excluded_recurring_names || []).filter((n: string) => n !== newItem.name);
    plan.stopped_recurring_names = (plan.stopped_recurring_names || []).filter((n: string) => n !== newItem.name);
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    if (newItem.is_recurring) {
      let m = plan.month + 1, y = plan.year;
      if (m > 12) { m = 1; y++; }
      await plansDB.populateMonths(m, y, FUTURE_PLAN_MONTHS);
    }
    return plan;
  },

  // Fills recurring items into `count` months starting at month/year.
  // Plans are created only for months that receive at least one item.
  populateMonths: async (month: number, year: number, count: number) => {
    const all = await plansDB.getAll();
    let changed = false;
    for (let i = 0; i < count; i++) {
      let m = month + i, y = year;
      while (m > 12) { m -= 12; y++; }
      let plan = all.find((p: any) => p.month === m && p.year === y);
      const isNew = !plan;
      if (!plan) {
        plan = { id: await generateId(), month: m, year: y, incomes: [], expenses: [], created_at: new Date().toISOString() };
      }
      const added = await applyRecurringToPlan(all, plan);
      if (added && isNew) all.push(plan);
      if (added) changed = true;
    }
    if (changed) await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
  },

  updateItem: async (planId: string, type: 'income' | 'expense', itemId: string, updates: any) => {
    const all = await plansDB.getAll();
    const plan = all.find((p: any) => p.id === planId);
    if (!plan) return;
    const list = type === 'income' ? plan.incomes : plan.expenses;
    const idx = list.findIndex((i: any) => i.id === itemId);
    if (idx >= 0) list[idx] = { ...list[idx], ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return plan;
  },

  deleteItem: async (planId: string, type: 'income' | 'expense', itemId: string) => {
    const all = await plansDB.getAll();
    const plan = all.find((p: any) => p.id === planId);
    if (!plan) return;
    const list = type === 'income' ? plan.incomes : plan.expenses;
    const deleted = list.find((i: any) => i.id === itemId);
    if (type === 'income') {
      plan.incomes = plan.incomes.filter((i: any) => i.id !== itemId);
    } else {
      plan.expenses = plan.expenses.filter((i: any) => i.id !== itemId);
    }
    if (deleted) {
      if (!plan.excluded_recurring_names) plan.excluded_recurring_names = [];
      if (!plan.excluded_recurring_names.includes(deleted.name)) {
        plan.excluded_recurring_names.push(deleted.name);
      }
    }
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return plan;
  },

  // Marks the first unpaid plan item in the transaction's month whose name matches the transaction's
  // description or linked credit (e.g. plan "Rata: Hipoteka" ↔ "Rata kredytu: Hipoteka").
  // Category is deliberately not matched: one grocery purchase must not mark "Jedzenie" as paid.
  linkTransaction: async (tx: any) => {
    if (!tx || tx.is_transfer || !tx.date) return;
    const d = new Date(tx.date);
    const all = await plansDB.getAll();
    const plan = all.find((p: any) => p.month === d.getMonth() + 1 && p.year === d.getFullYear());
    if (!plan) return;
    const list = (tx.type === 'income' ? plan.incomes : plan.expenses) || [];
    const candidates = [normalizePlanName(tx.description)];
    if (tx.credit_id) {
      const credit = (await getItems(STORAGE_KEYS.CREDITS)).find((c: any) => c.id === tx.credit_id);
      if (credit) candidates.push(normalizePlanName(credit.name));
    }
    const names = candidates.filter(Boolean);
    if (names.length === 0) return;
    const item = list.find((i: any) => !i.paid && names.includes(normalizePlanName(i.name)));
    if (!item) return;
    item.paid = true;
    item.paid_tx_id = tx.id;
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
  },

  // Reverts linkTransaction when the transaction is deleted or moved
  unlinkTransaction: async (txId: string) => {
    const all = await plansDB.getAll();
    let changed = false;
    all.forEach((plan: any) => {
      [...(plan.incomes || []), ...(plan.expenses || [])].forEach((i: any) => {
        if (i.paid_tx_id === txId) { i.paid = false; delete i.paid_tx_id; changed = true; }
      });
    });
    if (changed) await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
  },

  togglePaid: async (planId: string, type: 'income' | 'expense', itemId: string) => {
    const all = await plansDB.getAll();
    const plan = all.find((p: any) => p.id === planId);
    if (!plan) return;
    const list = type === 'income' ? plan.incomes : plan.expenses;
    const item = list.find((i: any) => i.id === itemId);
    if (item) { item.paid = !item.paid; delete item.paid_tx_id; }
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return plan;
  },

  copyToMonth: async (sourcePlanId: string, targetMonth: number, targetYear: number) => {
    const all = await plansDB.getAll();
    const source = all.find((p: any) => p.id === sourcePlanId);
    if (!source) return null;
    
    // Check if target already exists
    const existingTarget = all.find((p: any) => p.month === targetMonth && p.year === targetYear);
    if (existingTarget) return existingTarget;

    const newPlan = {
      id: await generateId(),
      month: targetMonth,
      year: targetYear,
      incomes: await Promise.all(source.incomes.map(async (i: any) => ({
        ...i, id: await generateId(), paid: false,
      }))),
      expenses: await Promise.all(source.expenses.map(async (e: any) => ({
        ...e, id: await generateId(), paid: false,
      }))),
      created_at: new Date().toISOString(),
    };
    all.push(newPlan);
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return newPlan;
  },

  copyToMultipleMonths: async (sourcePlanId: string, count: number) => {
    const all = await plansDB.getAll();
    const source = all.find((p: any) => p.id === sourcePlanId);
    if (!source) return;
    
    for (let i = 1; i <= count; i++) {
      let m = source.month + i;
      let y = source.year;
      while (m > 12) { m -= 12; y++; }
      
      const exists = all.find((p: any) => p.month === m && p.year === y);
      if (!exists) {
        const newPlan = {
          id: await generateId(),
          month: m,
          year: y,
          incomes: await Promise.all(source.incomes.map(async (inc: any) => ({
            ...inc, id: await generateId(), paid: false,
          }))),
          expenses: await Promise.all(source.expenses.map(async (exp: any) => ({
            ...exp, id: await generateId(), paid: false,
          }))),
          created_at: new Date().toISOString(),
        };
        all.push(newPlan);
      }
    }
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
  },

  deletePlan: async (planId: string) => {
    const all = await plansDB.getAll();
    const filtered = all.filter((p: any) => p.id !== planId);
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(filtered));
  },
  
  updatePlan: async (planId: string, data: any) => {
    const all = await plansDB.getAll();
    const idx = all.findIndex((p: any) => p.id === planId);
    if (idx !== -1) { all[idx] = { ...all[idx], ...data }; await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all)); }
  },
  
  updateItemInFutureMonths: async (planId: string, type: 'income' | 'expense', itemName: string, newAmount: number) => {
    const all = await plansDB.getAll();
    const sourcePlan = all.find((p: any) => p.id === planId);
    if (!sourcePlan) return 0;

    let count = 0;
    all.forEach((plan: any) => {
      // Only update future months (same or later)
      const isLater = plan.year > sourcePlan.year || (plan.year === sourcePlan.year && plan.month > sourcePlan.month);
      if (!isLater) return;

      const list = type === 'income' ? plan.incomes : plan.expenses;
      const item = list.find((i: any) => i.name === itemName);
      if (item) {
        item.amount = newAmount;
        count++;
      }
    });

    if (count > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    }
    return count;
  },

  updateItemInFutureMonthsFull: async (planId: string, type: 'income' | 'expense', originalName: string, updates: { name?: string; amount?: number; day?: number | null; is_recurring?: boolean; frequency?: number }) => {
    const all = await plansDB.getAll();
    const sourcePlan = all.find((p: any) => p.id === planId);
    if (!sourcePlan) return 0;

    let count = 0;
    all.forEach((plan: any) => {
      const isLater = plan.year > sourcePlan.year || (plan.year === sourcePlan.year && plan.month > sourcePlan.month);
      if (!isLater) return;

      const list = type === 'income' ? plan.incomes : plan.expenses;
      const item = list.find((i: any) => i.name === originalName);
      if (item) {
        if (updates.name !== undefined) item.name = updates.name;
        if (updates.amount !== undefined) item.amount = updates.amount;
        if (updates.day !== undefined) item.day = updates.day;
        if (updates.is_recurring !== undefined) item.is_recurring = updates.is_recurring;
        if (updates.frequency !== undefined) item.frequency = updates.frequency;
        count++;
      }
    });

    if (count > 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    }
    return count;
  },

  deleteItemInFutureMonths: async (planId: string, type: 'income' | 'expense', itemName: string) => {
    const all = await plansDB.getAll();
    const sourcePlan = all.find((p: any) => p.id === planId);
    if (!sourcePlan) return 0;

    // Stop the recurring item from this month onward, also for months not created yet
    if (!sourcePlan.stopped_recurring_names) sourcePlan.stopped_recurring_names = [];
    if (!sourcePlan.stopped_recurring_names.includes(itemName)) {
      sourcePlan.stopped_recurring_names.push(itemName);
    }

    let count = 0;
    all.forEach((plan: any) => {
      const isLater = plan.year > sourcePlan.year || (plan.year === sourcePlan.year && plan.month > sourcePlan.month);
      if (!isLater) return;

      const list = type === 'income' ? plan.incomes : plan.expenses;
      const filtered = list.filter((i: any) => i.name !== itemName);
      if (filtered.length < list.length) {
        if (type === 'income') plan.incomes = filtered;
        else plan.expenses = filtered;
        count++;
      }
    });

    // Always save since source plan was modified with the stop marker
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(all));
    return count;
  },
};
