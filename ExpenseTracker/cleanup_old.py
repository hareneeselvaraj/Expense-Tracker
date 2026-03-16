import sqlite3

DB = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
conn = sqlite3.connect(DB)

# Remove old hardcoded test transactions for test2 user (from Python import)
test2_id = '33A9C1A2-AF41-4962-AB67-1C4DC7C6E4D1'
count = conn.execute("SELECT COUNT(*) FROM Transactions WHERE UserId = ?", (test2_id,)).fetchone()[0]
print(f"test2 has {count} transactions before cleanup")

conn.execute("DELETE FROM Transactions WHERE UserId = ?", (test2_id,))
conn.commit()

count = conn.execute("SELECT COUNT(*) FROM Transactions WHERE UserId = ?", (test2_id,)).fetchone()[0]
print(f"test2 has {count} transactions after cleanup")

# Also clean Harenee's hardcoded imports
harenee_id = 'BC4C63CB-A94D-4BE8-823A-B52A0EB42C1A'
conn.execute("DELETE FROM Transactions WHERE UserId = ?", (harenee_id,))
conn.commit()
print("Cleaned all old hardcoded test data")
conn.close()
