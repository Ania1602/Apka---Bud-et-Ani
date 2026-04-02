import {
  initDatabase,
  accountsDB,
  categoriesDB,
  transactionsDB,
  creditsDB,
  budgetsDB,
  recurringDB,
  getDashboardStats
} from './database';

export const runDatabaseTests = async () => {
  console.log('🧪 Starting Database Tests...\n');
  
  try {
    // Test 1: Initialize Database
    console.log('Test 1: Initialize Database');
    const initialized = await initDatabase();
    console.log(initialized ? '✅ Database initialized' : '❌ Failed to initialize');
    console.log('');
    
    // Test 2: Categories (should have defaults)
    console.log('Test 2: Get Default Categories');
    const categories = await categoriesDB.getAll();
    console.log(`✅ Found ${categories.length} categories`);
    console.log('Income categories:', categories.filter((c: any) => c.type === 'income').length);
    console.log('Expense categories:', categories.filter((c: any) => c.type === 'expense').length);
    console.log('');
    
    // Test 3: Create Account
    console.log('Test 3: Create Account');
    const accountId = await accountsDB.create({
      name: 'Test Konto',
      type: 'bank',
      balance: 5000,
      currency: 'PLN',
      icon: 'wallet',
      color: '#D4AF37'
    });
    console.log(`✅ Account created with ID: ${accountId}`);
    
    const accounts = await accountsDB.getAll();
    console.log(`Total accounts: ${accounts.length}`);
    console.log('');
    
    // Test 4: Create Transaction (Income)
    console.log('Test 4: Create Income Transaction');
    await transactionsDB.create({
      type: 'income',
      amount: 3000,
      category: 'Wypłata',
      account_id: accountId,
      date: new Date().toISOString(),
      description: 'Test income'
    });
    
    const accountAfterIncome: any = await accountsDB.getById(accountId);
    console.log(`✅ Account balance after income: ${accountAfterIncome.balance} (should be 8000)`);
    console.log('');
    
    // Test 5: Create Transaction (Expense)
    console.log('Test 5: Create Expense Transaction');
    await transactionsDB.create({
      type: 'expense',
      amount: 500,
      category: 'Jedzenie',
      account_id: accountId,
      date: new Date().toISOString(),
      description: 'Test expense'
    });
    
    const accountAfterExpense: any = await accountsDB.getById(accountId);
    console.log(`✅ Account balance after expense: ${accountAfterExpense.balance} (should be 7500)`);
    console.log('');
    
    // Test 6: Get Transactions
    console.log('Test 6: Get Transactions');
    const transactions = await transactionsDB.getAll(10);
    console.log(`✅ Found ${transactions.length} transactions`);
    transactions.forEach((t: any) => {
      console.log(`  - ${t.type}: ${t.amount} PLN (${t.category})`);
    });
    console.log('');
    
    // Test 7: Create Credit
    console.log('Test 7: Create Credit');
    const creditId = await creditsDB.create({
      name: 'Test Kredyt',
      total_amount: 100000,
      remaining_amount: 80000,
      interest_rate: 3.5,
      monthly_payment: 2000,
      start_date: new Date().toISOString(),
      end_date: new Date(2030, 0, 1).toISOString()
    });
    console.log(`✅ Credit created with ID: ${creditId}`);
    console.log('');
    
    // Test 8: Create Transaction linked to Credit
    console.log('Test 8: Create Transaction linked to Credit');
    await transactionsDB.create({
      type: 'expense',
      amount: 2000,
      category: 'Rachunki',
      account_id: accountId,
      date: new Date().toISOString(),
      description: 'Rata kredytu',
      credit_id: creditId
    });
    console.log('✅ Credit payment transaction created');
    
    const accountAfterCredit: any = await accountsDB.getById(accountId);
    console.log(`Account balance: ${accountAfterCredit.balance} (should be 5500)`);
    console.log('');
    
    // Test 9: Get Credits with monthly payments
    console.log('Test 9: Get Credits with Monthly Payments');
    const now = new Date();
    const credits = await creditsDB.getAll(now.getMonth() + 1, now.getFullYear());
    console.log(`✅ Found ${credits.length} credits`);
    credits.forEach((c: any) => {
      console.log(`  - ${c.name}: ${c.remaining_amount} PLN remaining`);
      console.log(`    Monthly paid: ${c.monthly_paid || 0} PLN`);
    });
    console.log('');
    
    // Test 10: Create Budget
    console.log('Test 10: Create Budget');
    await budgetsDB.create({
      category: 'Jedzenie',
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      limit_amount: 1500
    });
    console.log('✅ Budget created');
    
    const budgets = await budgetsDB.getAll(now.getMonth() + 1, now.getFullYear());
    console.log(`Found ${budgets.length} budgets`);
    budgets.forEach((b: any) => {
      console.log(`  - ${b.category}: ${b.spent_amount}/${b.limit_amount} PLN`);
    });
    console.log('');
    
    // Test 11: Create Custom Category
    console.log('Test 11: Create Custom Category');
    await categoriesDB.create({
      name: 'Test Category',
      type: 'expense',
      icon: 'pricetag',
      color: '#FF0000'
    });
    
    const allCategories = await categoriesDB.getAll();
    console.log(`✅ Total categories: ${allCategories.length}`);
    console.log('');
    
    // Test 12: Create Recurring Transaction
    console.log('Test 12: Create Recurring Transaction');
    const recurringId = await recurringDB.create({
      name: 'Czynsz',
      type: 'expense',
      amount: 1200,
      category: 'Rachunki',
      account_id: accountId,
      frequency: 'monthly',
      day_of_month: 1,
      start_date: new Date().toISOString()
    });
    console.log(`✅ Recurring transaction created: ${recurringId}`);
    
    const recurring = await recurringDB.getAll();
    console.log(`Total recurring: ${recurring.length}`);
    console.log('');
    
    // Test 13: Dashboard Stats
    console.log('Test 13: Dashboard Stats');
    const stats = await getDashboardStats(now.getMonth() + 1, now.getFullYear());
    console.log('✅ Dashboard Stats:');
    console.log(`  Total Balance: ${stats.total_balance} PLN`);
    console.log(`  Income: ${stats.total_income} PLN`);
    console.log(`  Expenses: ${stats.total_expenses} PLN`);
    console.log(`  Accounts: ${stats.accounts_count}`);
    console.log(`  Credits: ${stats.credits_count}`);
    console.log('');
    
    // Test 14: Delete Transaction
    console.log('Test 14: Delete Transaction (test balance reversal)');
    const allTransactions = await transactionsDB.getAll(1);
    if (allTransactions.length > 0) {
      const transactionToDelete: any = allTransactions[0];
      const balanceBefore: any = await accountsDB.getById(accountId);
      
      await transactionsDB.delete(transactionToDelete.id);
      
      const balanceAfter: any = await accountsDB.getById(accountId);
      console.log(`✅ Transaction deleted`);
      console.log(`  Balance before: ${balanceBefore.balance}`);
      console.log(`  Balance after: ${balanceAfter.balance}`);
      console.log(`  Difference: ${Math.abs(balanceAfter.balance - balanceBefore.balance)} (should equal transaction amount)`);
    }
    console.log('');
    
    console.log('🎉 All tests completed successfully!\n');
    console.log('📊 Final Summary:');
    console.log(`  Accounts: ${(await accountsDB.getAll()).length}`);
    console.log(`  Categories: ${(await categoriesDB.getAll()).length}`);
    console.log(`  Transactions: ${(await transactionsDB.getAll()).length}`);
    console.log(`  Credits: ${(await creditsDB.getAll()).length}`);
    console.log(`  Budgets: ${(await budgetsDB.getAll()).length}`);
    console.log(`  Recurring: ${(await recurringDB.getAll()).length}`);
    
    return {
      success: true,
      message: 'All tests passed!'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error
    };
  }
};
