import sqlite3
import os

db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
if not os.path.exists(db_path):
    print("DB not found at", db_path)
    exit()

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Get users
c.execute("SELECT Email, Id FROM Users")
users = c.fetchall()
print("Users:", users)

with open('debug_out.txt', 'w') as f:
    uid = 'C3AF7454-314D-4212-9471-AD401761C1CC'
    f.write(f"\nChecking Transaction Types for rammar ( {uid} )\n")
    c.execute("SELECT Type, COUNT(*) FROM Transactions WHERE UserId = ? GROUP BY Type", (uid,))
    types = c.fetchall()
    for t in types:
        f.write(f"Type: {t[0]} (Type of {t[0]}: {type(t[0])}), Count: {t[1]}\n")

    c.execute("SELECT Date, Type, Amount FROM Transactions WHERE UserId = ? AND (Type = 'Investment' OR Type = 'investment') LIMIT 5", (uid,))
    samples = c.fetchall()
    for s in samples:
        f.write(f"Sample: Date={s[0]}, Type={s[1]}, Amt={s[2]}\n")

conn.close()
print("Done. Output in debug_out.txt")
