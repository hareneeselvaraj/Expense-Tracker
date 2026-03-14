import sqlite3

db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
conn = sqlite3.connect(db_path)

print("=== CATEGORIES ===")
for r in conn.execute("SELECT Id, Name, Type FROM Categories"):
    print(f"  {r[0]}  |  {r[1]}  |  {r[2]}")

print("\n=== ACCOUNTS ===")
for r in conn.execute("SELECT Id, Name, Type FROM Accounts"):
    print(f"  {r[0]}  |  {r[1]}  |  {r[2]}")

print("\n=== USERS ===")
for r in conn.execute("SELECT Id, Name FROM Users"):
    print(f"  {r[0]}  |  {r[1]}")

conn.close()
