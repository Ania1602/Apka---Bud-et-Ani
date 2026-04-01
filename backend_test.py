#!/usr/bin/env python3
"""
Budget Manager Backend API Testing - Budget and Recurring Transactions
Testing new budget and recurring transaction endpoints
"""

import requests
import json
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Backend URL
BASE_URL = "https://money-manager-all.preview.emergentagent.com/api"

def test_budgets_and_recurring():
    """Test budget and recurring transaction endpoints"""
    print("🧪 Testing Budget Manager - Budgets and Recurring Transactions")
    print("=" * 70)
    
    # First, get existing account for testing
    print("\n1. Getting existing account for testing...")
    try:
        response = requests.get(f"{BASE_URL}/accounts")
        response.raise_for_status()
        accounts = response.json()
        
        if not accounts:
            print("❌ No accounts found. Creating test account...")
            account_data = {
                "name": "Test Account",
                "type": "bank",
                "balance": 5000.0,
                "currency": "PLN",
                "icon": "wallet",
                "color": "#4CAF50"
            }
            response = requests.post(f"{BASE_URL}/accounts", json=account_data)
            response.raise_for_status()
            account = response.json()
            account_id = account["id"]
            print(f"✅ Created test account: {account['name']} (ID: {account_id})")
        else:
            account_id = accounts[0]["id"]
            print(f"✅ Using existing account: {accounts[0]['name']} (ID: {account_id})")
            print(f"   Current balance: {accounts[0]['balance']} PLN")
    except Exception as e:
        print(f"❌ Failed to get/create account: {e}")
        return False
    
    # Test Budget Endpoints
    print("\n" + "="*50)
    print("TESTING BUDGET ENDPOINTS")
    print("="*50)
    
    budget_id = None
    
    # Test 1: Create budget for "Jedzenie" category
    print("\n2. Testing POST /api/budgets - Create budget for 'Jedzenie'...")
    try:
        budget_data = {
            "category": "Jedzenie",
            "month": 4,
            "year": 2026,
            "limit_amount": 1500.0,
            "spent_amount": 0.0
        }
        response = requests.post(f"{BASE_URL}/budgets", json=budget_data)
        response.raise_for_status()
        budget = response.json()
        budget_id = budget["id"]
        
        print(f"✅ Budget created successfully:")
        print(f"   ID: {budget['id']}")
        print(f"   Category: {budget['category']}")
        print(f"   Month/Year: {budget['month']}/{budget['year']}")
        print(f"   Limit: {budget['limit_amount']} PLN")
        print(f"   Spent: {budget['spent_amount']} PLN")
    except Exception as e:
        print(f"❌ Failed to create budget: {e}")
        return False
    
    # Test 2: Get all budgets
    print("\n3. Testing GET /api/budgets - Get all budgets...")
    try:
        response = requests.get(f"{BASE_URL}/budgets")
        response.raise_for_status()
        budgets = response.json()
        
        print(f"✅ Retrieved {len(budgets)} budget(s):")
        for budget in budgets:
            print(f"   - {budget['category']}: {budget['spent_amount']}/{budget['limit_amount']} PLN ({budget['month']}/{budget['year']})")
    except Exception as e:
        print(f"❌ Failed to get budgets: {e}")
        return False
    
    # Test 3: Get current month budgets
    print("\n4. Testing GET /api/budgets/current - Get current month budgets...")
    try:
        response = requests.get(f"{BASE_URL}/budgets/current")
        response.raise_for_status()
        current_budgets = response.json()
        
        print(f"✅ Retrieved {len(current_budgets)} current month budget(s):")
        for budget in current_budgets:
            print(f"   - {budget['category']}: {budget['spent_amount']}/{budget['limit_amount']} PLN")
    except Exception as e:
        print(f"❌ Failed to get current budgets: {e}")
        return False
    
    # Test Recurring Transaction Endpoints
    print("\n" + "="*60)
    print("TESTING RECURRING TRANSACTION ENDPOINTS")
    print("="*60)
    
    recurring_id = None
    
    # Test 4: Create recurring transaction for "Czynsz"
    print("\n5. Testing POST /api/recurring-transactions - Create recurring expense...")
    try:
        recurring_data = {
            "name": "Czynsz",
            "type": "expense",
            "amount": 1200.0,
            "category": "Rachunki",
            "account_id": account_id,
            "frequency": "monthly",
            "day_of_month": 1,
            "start_date": datetime.now().isoformat(),
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/recurring-transactions", json=recurring_data)
        response.raise_for_status()
        recurring = response.json()
        recurring_id = recurring["id"]
        
        print(f"✅ Recurring transaction created successfully:")
        print(f"   ID: {recurring['id']}")
        print(f"   Name: {recurring['name']}")
        print(f"   Type: {recurring['type']}")
        print(f"   Amount: {recurring['amount']} PLN")
        print(f"   Category: {recurring['category']}")
        print(f"   Frequency: {recurring['frequency']}")
        print(f"   Next due date: {recurring.get('next_due_date', 'Not calculated')}")
    except Exception as e:
        print(f"❌ Failed to create recurring transaction: {e}")
        return False
    
    # Test 5: Get all recurring transactions
    print("\n6. Testing GET /api/recurring-transactions - Get all recurring transactions...")
    try:
        response = requests.get(f"{BASE_URL}/recurring-transactions")
        response.raise_for_status()
        recurrings = response.json()
        
        print(f"✅ Retrieved {len(recurrings)} recurring transaction(s):")
        for rec in recurrings:
            print(f"   - {rec['name']}: {rec['amount']} PLN ({rec['frequency']}) - Next: {rec.get('next_due_date', 'N/A')}")
    except Exception as e:
        print(f"❌ Failed to get recurring transactions: {e}")
        return False
    
    # Test 6: Execute recurring transaction
    print(f"\n7. Testing POST /api/recurring-transactions/{recurring_id}/execute - Execute recurring transaction...")
    try:
        # Get account balance before execution
        response = requests.get(f"{BASE_URL}/accounts")
        response.raise_for_status()
        accounts_before = response.json()
        balance_before = next(acc["balance"] for acc in accounts_before if acc["id"] == account_id)
        print(f"   Account balance before execution: {balance_before} PLN")
        
        # Execute recurring transaction
        response = requests.post(f"{BASE_URL}/recurring-transactions/{recurring_id}/execute")
        response.raise_for_status()
        executed_transaction = response.json()
        
        print(f"✅ Recurring transaction executed successfully:")
        print(f"   Transaction ID: {executed_transaction['id']}")
        print(f"   Amount: {executed_transaction['amount']} PLN")
        print(f"   Description: {executed_transaction['description']}")
        
        # Verify account balance was updated
        response = requests.get(f"{BASE_URL}/accounts")
        response.raise_for_status()
        accounts_after = response.json()
        balance_after = next(acc["balance"] for acc in accounts_after if acc["id"] == account_id)
        print(f"   Account balance after execution: {balance_after} PLN")
        
        expected_balance = balance_before - 1200.0  # expense transaction
        if abs(balance_after - expected_balance) < 0.01:
            print(f"✅ Account balance updated correctly (decreased by 1200.0 PLN)")
        else:
            print(f"❌ Account balance not updated correctly. Expected: {expected_balance}, Got: {balance_after}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to execute recurring transaction: {e}")
        return False
    
    # Test 7: Verify transaction was created
    print("\n8. Verifying transaction was created...")
    try:
        response = requests.get(f"{BASE_URL}/transactions?account_id={account_id}")
        response.raise_for_status()
        transactions = response.json()
        
        # Find the recurring transaction we just created
        recurring_transaction = None
        for trans in transactions:
            if "Płatność cykliczna: Czynsz" in trans.get("description", ""):
                recurring_transaction = trans
                break
        
        if recurring_transaction:
            print(f"✅ Transaction created from recurring transaction:")
            print(f"   ID: {recurring_transaction['id']}")
            print(f"   Amount: {recurring_transaction['amount']} PLN")
            print(f"   Category: {recurring_transaction['category']}")
            print(f"   Description: {recurring_transaction['description']}")
        else:
            print(f"❌ Transaction from recurring transaction not found")
            return False
            
    except Exception as e:
        print(f"❌ Failed to verify transaction creation: {e}")
        return False
    
    # Integration Test
    print("\n" + "="*50)
    print("INTEGRATION TEST - Budget Tracking")
    print("="*50)
    
    # Test 8: Create budget for "Jedzenie" with limit 1000
    print("\n9. Creating budget for 'TestCategory' with limit 1000 PLN...")
    try:
        integration_budget_data = {
            "category": "TestCategory",
            "month": datetime.now().month,
            "year": datetime.now().year,
            "limit_amount": 1000.0,
            "spent_amount": 0.0
        }
        response = requests.post(f"{BASE_URL}/budgets", json=integration_budget_data)
        response.raise_for_status()
        integration_budget = response.json()
        integration_budget_id = integration_budget["id"]
        
        print(f"✅ Integration budget created: {integration_budget['category']} - {integration_budget['limit_amount']} PLN")
    except Exception as e:
        print(f"❌ Failed to create integration budget: {e}")
        return False
    
    # Test 9: Create transaction in "TestCategory" category for 300 PLN
    print("\n10. Creating transaction in 'TestCategory' category for 300 PLN...")
    try:
        transaction_data = {
            "type": "expense",
            "amount": 300.0,
            "category": "TestCategory",
            "account_id": account_id,
            "date": datetime.now().isoformat(),
            "description": "Test integration transaction"
        }
        response = requests.post(f"{BASE_URL}/transactions", json=transaction_data)
        response.raise_for_status()
        transaction = response.json()
        
        print(f"✅ Transaction created: {transaction['amount']} PLN in {transaction['category']}")
    except Exception as e:
        print(f"❌ Failed to create integration transaction: {e}")
        return False
    
    # Test 10: Verify budget spent_amount is updated
    print("\n11. Verifying budget spent_amount is updated...")
    try:
        response = requests.get(f"{BASE_URL}/budgets")
        response.raise_for_status()
        budgets = response.json()
        
        # Find our integration budget
        integration_budget_updated = None
        for budget in budgets:
            if budget["id"] == integration_budget_id:
                integration_budget_updated = budget
                break
        
        if integration_budget_updated:
            spent_amount = integration_budget_updated["spent_amount"]
            print(f"✅ Budget spent_amount updated: {spent_amount} PLN")
            
            if abs(spent_amount - 300.0) < 0.01:
                print(f"✅ Budget tracking working correctly (spent: {spent_amount} PLN)")
            else:
                print(f"❌ Budget tracking not working correctly. Expected: 300.0, Got: {spent_amount}")
                return False
        else:
            print(f"❌ Integration budget not found")
            return False
            
    except Exception as e:
        print(f"❌ Failed to verify budget update: {e}")
        return False
    
    # Cleanup Tests
    print("\n" + "="*40)
    print("CLEANUP TESTS")
    print("="*40)
    
    # Test 11: Delete budget
    print(f"\n12. Testing DELETE /api/budgets/{budget_id} - Delete budget...")
    try:
        response = requests.delete(f"{BASE_URL}/budgets/{budget_id}")
        response.raise_for_status()
        result = response.json()
        
        print(f"✅ Budget deleted successfully: {result['message']}")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/budgets")
        response.raise_for_status()
        remaining_budgets = response.json()
        
        deleted_budget_found = any(b["id"] == budget_id for b in remaining_budgets)
        if not deleted_budget_found:
            print(f"✅ Budget deletion verified - budget no longer exists")
        else:
            print(f"❌ Budget deletion failed - budget still exists")
            return False
            
    except Exception as e:
        print(f"❌ Failed to delete budget: {e}")
        return False
    
    # Test 12: Delete recurring transaction
    print(f"\n13. Testing DELETE /api/recurring-transactions/{recurring_id} - Delete recurring transaction...")
    try:
        response = requests.delete(f"{BASE_URL}/recurring-transactions/{recurring_id}")
        response.raise_for_status()
        result = response.json()
        
        print(f"✅ Recurring transaction deleted successfully: {result['message']}")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/recurring-transactions")
        response.raise_for_status()
        remaining_recurrings = response.json()
        
        deleted_recurring_found = any(r["id"] == recurring_id for r in remaining_recurrings)
        if not deleted_recurring_found:
            print(f"✅ Recurring transaction deletion verified - transaction no longer exists")
        else:
            print(f"❌ Recurring transaction deletion failed - transaction still exists")
            return False
            
    except Exception as e:
        print(f"❌ Failed to delete recurring transaction: {e}")
        return False
    
    print("\n" + "="*70)
    print("🎉 ALL BUDGET AND RECURRING TRANSACTION TESTS PASSED!")
    print("="*70)
    return True

if __name__ == "__main__":
    success = test_budgets_and_recurring()
    if success:
        print("\n✅ Budget and Recurring Transaction API testing completed successfully!")
    else:
        print("\n❌ Budget and Recurring Transaction API testing failed!")
        exit(1)