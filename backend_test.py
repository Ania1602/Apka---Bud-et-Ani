#!/usr/bin/env python3
"""
Budget Manager Backend API Testing
Tests all backend endpoints as specified in the review request
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Backend URL from frontend .env
BACKEND_URL = "https://money-manager-all.preview.emergentagent.com/api"

class BudgetManagerTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_account_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
        if not success:
            print(f"   Details: {response_data}")
    
    def test_initialize_categories(self):
        """Test POST /api/initialize - Initialize default categories"""
        try:
            response = self.session.post(f"{self.base_url}/initialize")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Initialize Categories", True, 
                            f"Categories initialized: {data.get('message', 'Success')}")
                return True
            else:
                self.log_test("Initialize Categories", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Initialize Categories", False, f"Exception: {str(e)}")
            return False
    
    def test_create_account(self):
        """Test POST /api/accounts - Create test bank account"""
        try:
            account_data = {
                "name": "Konto główne",
                "type": "bank", 
                "balance": 5000.0,
                "currency": "PLN",
                "icon": "wallet",
                "color": "#4CAF50"
            }
            
            response = self.session.post(f"{self.base_url}/accounts", 
                                       json=account_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_account_id = data.get("id")
                self.log_test("Create Account", True, 
                            f"Account created with ID: {self.test_account_id}")
                return True
            else:
                self.log_test("Create Account", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Account", False, f"Exception: {str(e)}")
            return False
    
    def test_get_accounts(self):
        """Test GET /api/accounts - Verify account was created"""
        try:
            response = self.session.get(f"{self.base_url}/accounts")
            
            if response.status_code == 200:
                accounts = response.json()
                if isinstance(accounts, list) and len(accounts) > 0:
                    # Check if our test account exists
                    test_account = next((acc for acc in accounts 
                                       if acc.get("name") == "Konto główne"), None)
                    if test_account:
                        self.log_test("Get Accounts", True, 
                                    f"Found {len(accounts)} accounts including test account")
                        return True
                    else:
                        self.log_test("Get Accounts", False, 
                                    "Test account 'Konto główne' not found in response")
                        return False
                else:
                    self.log_test("Get Accounts", False, 
                                "No accounts returned or invalid response format")
                    return False
            else:
                self.log_test("Get Accounts", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Accounts", False, f"Exception: {str(e)}")
            return False
    
    def test_get_categories(self):
        """Test GET /api/categories - Get all categories"""
        try:
            response = self.session.get(f"{self.base_url}/categories")
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    self.log_test("Get All Categories", True, 
                                f"Retrieved {len(categories)} categories")
                    return True
                else:
                    self.log_test("Get All Categories", False, 
                                "No categories returned")
                    return False
            else:
                self.log_test("Get All Categories", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get All Categories", False, f"Exception: {str(e)}")
            return False
    
    def test_get_income_categories(self):
        """Test GET /api/categories?type=income - Get income categories"""
        try:
            response = self.session.get(f"{self.base_url}/categories?type=income")
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list):
                    # Verify all returned categories are income type
                    income_only = all(cat.get("type") == "income" for cat in categories)
                    if income_only:
                        self.log_test("Get Income Categories", True, 
                                    f"Retrieved {len(categories)} income categories")
                        return True
                    else:
                        self.log_test("Get Income Categories", False, 
                                    "Response contains non-income categories")
                        return False
                else:
                    self.log_test("Get Income Categories", False, 
                                "Invalid response format")
                    return False
            else:
                self.log_test("Get Income Categories", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Income Categories", False, f"Exception: {str(e)}")
            return False
    
    def test_get_expense_categories(self):
        """Test GET /api/categories?type=expense - Get expense categories"""
        try:
            response = self.session.get(f"{self.base_url}/categories?type=expense")
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list):
                    # Verify all returned categories are expense type
                    expense_only = all(cat.get("type") == "expense" for cat in categories)
                    if expense_only:
                        self.log_test("Get Expense Categories", True, 
                                    f"Retrieved {len(categories)} expense categories")
                        return True
                    else:
                        self.log_test("Get Expense Categories", False, 
                                    "Response contains non-expense categories")
                        return False
                else:
                    self.log_test("Get Expense Categories", False, 
                                "Invalid response format")
                    return False
            else:
                self.log_test("Get Expense Categories", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Expense Categories", False, f"Exception: {str(e)}")
            return False
    
    def test_create_income_transaction(self):
        """Test POST /api/transactions - Create income transaction"""
        if not self.test_account_id:
            self.log_test("Create Income Transaction", False, 
                        "No test account ID available")
            return False
            
        try:
            transaction_data = {
                "type": "income",
                "amount": 3000.0,
                "category": "Wypłata",
                "account_id": self.test_account_id,
                "date": datetime.utcnow().isoformat(),
                "description": "Test salary payment"
            }
            
            response = self.session.post(f"{self.base_url}/transactions", 
                                       json=transaction_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Create Income Transaction", True, 
                            f"Income transaction created with ID: {data.get('id')}")
                return True
            else:
                self.log_test("Create Income Transaction", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Income Transaction", False, f"Exception: {str(e)}")
            return False
    
    def test_create_expense_transaction(self):
        """Test POST /api/transactions - Create expense transaction"""
        if not self.test_account_id:
            self.log_test("Create Expense Transaction", False, 
                        "No test account ID available")
            return False
            
        try:
            transaction_data = {
                "type": "expense",
                "amount": 500.0,
                "category": "Jedzenie",
                "account_id": self.test_account_id,
                "date": datetime.utcnow().isoformat(),
                "description": "Test food expense"
            }
            
            response = self.session.post(f"{self.base_url}/transactions", 
                                       json=transaction_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Create Expense Transaction", True, 
                            f"Expense transaction created with ID: {data.get('id')}")
                return True
            else:
                self.log_test("Create Expense Transaction", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Expense Transaction", False, f"Exception: {str(e)}")
            return False
    
    def test_get_transactions(self):
        """Test GET /api/transactions - Get all transactions"""
        try:
            response = self.session.get(f"{self.base_url}/transactions")
            
            if response.status_code == 200:
                transactions = response.json()
                if isinstance(transactions, list):
                    self.log_test("Get Transactions", True, 
                                f"Retrieved {len(transactions)} transactions")
                    return True
                else:
                    self.log_test("Get Transactions", False, 
                                "Invalid response format")
                    return False
            else:
                self.log_test("Get Transactions", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Transactions", False, f"Exception: {str(e)}")
            return False
    
    def test_account_balance_update(self):
        """Verify account balance was updated correctly after transactions"""
        if not self.test_account_id:
            self.log_test("Account Balance Update", False, 
                        "No test account ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/accounts")
            
            if response.status_code == 200:
                accounts = response.json()
                test_account = next((acc for acc in accounts 
                                   if acc.get("id") == self.test_account_id), None)
                
                if test_account:
                    # Expected balance: 5000 (initial) + 3000 (income) - 500 (expense) = 7500
                    expected_balance = 7500.0
                    actual_balance = test_account.get("balance", 0)
                    
                    if abs(actual_balance - expected_balance) < 0.01:  # Allow for floating point precision
                        self.log_test("Account Balance Update", True, 
                                    f"Balance correctly updated to {actual_balance}")
                        return True
                    else:
                        self.log_test("Account Balance Update", False, 
                                    f"Balance mismatch. Expected: {expected_balance}, Got: {actual_balance}")
                        return False
                else:
                    self.log_test("Account Balance Update", False, 
                                "Test account not found")
                    return False
            else:
                self.log_test("Account Balance Update", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Account Balance Update", False, f"Exception: {str(e)}")
            return False
    
    def test_create_credit(self):
        """Test POST /api/credits - Create a credit"""
        try:
            credit_data = {
                "name": "Kredyt hipoteczny",
                "total_amount": 200000.0,
                "remaining_amount": 150000.0,
                "interest_rate": 3.5,
                "monthly_payment": 2000.0,
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=365*10)).isoformat()  # 10 years
            }
            
            response = self.session.post(f"{self.base_url}/credits", 
                                       json=credit_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Create Credit", True, 
                            f"Credit created with ID: {data.get('id')}")
                return True
            else:
                self.log_test("Create Credit", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Credit", False, f"Exception: {str(e)}")
            return False
    
    def test_get_credits(self):
        """Test GET /api/credits - Get all credits"""
        try:
            response = self.session.get(f"{self.base_url}/credits")
            
            if response.status_code == 200:
                credits = response.json()
                if isinstance(credits, list):
                    # Check if our test credit exists
                    test_credit = next((credit for credit in credits 
                                      if credit.get("name") == "Kredyt hipoteczny"), None)
                    if test_credit:
                        self.log_test("Get Credits", True, 
                                    f"Retrieved {len(credits)} credits including test credit")
                        return True
                    else:
                        self.log_test("Get Credits", False, 
                                    "Test credit 'Kredyt hipoteczny' not found")
                        return False
                else:
                    self.log_test("Get Credits", False, 
                                "Invalid response format")
                    return False
            else:
                self.log_test("Get Credits", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Credits", False, f"Exception: {str(e)}")
            return False
    
    def test_dashboard_stats(self):
        """Test GET /api/dashboard/stats - Get dashboard statistics"""
        try:
            response = self.session.get(f"{self.base_url}/dashboard/stats")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_balance", "total_income", "total_expenses", 
                                 "accounts_count", "credits_count"]
                
                missing_fields = [field for field in required_fields 
                                if field not in stats]
                
                if not missing_fields:
                    self.log_test("Dashboard Stats", True, 
                                f"All required fields present: {stats}")
                    return True
                else:
                    self.log_test("Dashboard Stats", False, 
                                f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Dashboard Stats", False, 
                            f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print(f"🚀 Starting Budget Manager Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence as specified in review request
        tests = [
            self.test_initialize_categories,
            self.test_create_account,
            self.test_get_accounts,
            self.test_get_categories,
            self.test_get_income_categories,
            self.test_get_expense_categories,
            self.test_create_income_transaction,
            self.test_create_expense_transaction,
            self.test_get_transactions,
            self.test_account_balance_update,
            self.test_create_credit,
            self.test_get_credits,
            self.test_dashboard_stats
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Unexpected error: {str(e)}")
                failed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"📊 Test Summary: {passed} passed, {failed} failed")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = BudgetManagerTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)