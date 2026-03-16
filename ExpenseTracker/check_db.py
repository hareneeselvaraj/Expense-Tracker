import sqlite3
conn = sqlite3.connect(r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db')

# Check all users
user_id = '33A9C1A2-AF41-4962-AB67-1C4DC7C6E4D1'  # test2
user_id2 = '56D6B348-8A2E-4ADF-9758-C2770DD5855E'  # Test2 (test2@test.com)

for uid, name in [(user_id, 'test2 (test3@gmail.com)'), (user_id2, 'Test2 (test2@test.com)')]:
    count = conn.execute("SELECT COUNT(*) FROM Transactions WHERE UserId = ?", (uid,)).fetchone()[0]
    print(f"{name}: {count} transactions")
    if count > 0:
        for r in conn.execute("SELECT Date, Description, Amount, Type FROM Transactions WHERE UserId = ? LIMIT 5", (uid,)):
            print(f"  {r}")

# Check all transactions
total = conn.execute("SELECT COUNT(*) FROM Transactions").fetchone()[0]
print(f"\nTotal transactions in DB: {total}")

# Check which user has accounts
print("\nAccounts:")
for r in conn.execute("SELECT Id, Name, UserId FROM Accounts"):
    print(f"  {r[0][:8]}... | {r[1]} | {r[2][:8]}...")

conn.close()
