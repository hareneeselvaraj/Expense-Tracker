import sqlite3, codecs

conn = sqlite3.connect(r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db')

with codecs.open(r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\db_report2.txt', 'w', 'utf-8') as f:
    f.write("=== Transactions grouped by UserId ===\n")
    for r in conn.execute("SELECT UserId, COUNT(*), GROUP_CONCAT(DISTINCT Type) FROM Transactions GROUP BY UserId"):
        f.write(f"\nUserId: {r[0]}\n  Count: {r[1]}\n  Types: {r[2]}\n")
        # Look up user name
        user = conn.execute("SELECT Name, Email FROM Users WHERE Id = ?", (r[0],)).fetchone()
        if user:
            f.write(f"  User: {user[0]} ({user[1]})\n")
        # Sample transactions
        for t in conn.execute("SELECT Date, Description, Amount, Type FROM Transactions WHERE UserId = ? LIMIT 3", (r[0],)):
            f.write(f"    {t}\n")

conn.close()
print("Done")
