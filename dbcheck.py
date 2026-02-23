import sqlite3
conn = sqlite3.connect(r'C:\Users\HareneeS\Desktop\Expense_Tracker\ExpenseTracker\expense.db')
cur = conn.cursor()

print('=== RAW Type values ===')
for r in cur.execute("SELECT DISTINCT Type, typeof(Type) FROM Transactions"):
    print(f'  Type={r[0]}  sqltype={r[1]}')

print()
print('=== FEB 2026 EXPENSES (string match) ===')
for r in cur.execute("SELECT CategoryId, SUM(Amount), COUNT(*) FROM Transactions WHERE Type='Expense' AND Date >= '2026-02-01' AND Date < '2026-03-01' GROUP BY CategoryId"):
    print(f'  cat={r[0]} total={r[1]} count={r[2]}')

print()
print('=== FEB 2026 EXPENSES (integer match) ===')
for r in cur.execute("SELECT CategoryId, SUM(Amount), COUNT(*) FROM Transactions WHERE Type=2 AND Date >= '2026-02-01' AND Date < '2026-03-01' GROUP BY CategoryId"):
    print(f'  cat={r[0]} total={r[1]} count={r[2]}')

print()
print('=== RAW Date values (last 5) ===')
for r in cur.execute("SELECT Date, typeof(Date), Amount, Type FROM Transactions ORDER BY Date DESC LIMIT 5"):
    print(f'  date={r[0]}  datetype={r[1]}  amt={r[2]}  type={r[3]}')

print()
print('=== Budget compared to spending ===')
for r in cur.execute("""
    SELECT b.CategoryId, b.Amount as BudgetAmt, 
           COALESCE((SELECT SUM(t.Amount) FROM Transactions t 
                     WHERE t.CategoryId = b.CategoryId 
                     AND t.Type = 'Expense' 
                     AND t.Date >= '2026-02-01' AND t.Date < '2026-03-01'), 0) as TotalSpent
    FROM Budgets b WHERE b.Month = 2 AND b.Year = 2026
"""):
    exceeded = 'YES' if r[2] > r[1] else 'NO'
    print(f'  cat={r[0]}  budget={r[1]}  spent={r[2]}  exceeded={exceeded}')

conn.close()
