using Microsoft.Data.Sqlite;

var dbPath = @"C:\Users\HareneeS\Desktop\Expense_Tracker\ExpenseTracker\expense.db";
using var conn = new SqliteConnection($"Data Source={dbPath}");
conn.Open();

Console.WriteLine("=== BUDGETS ===");
using (var cmd = conn.CreateCommand())
{
    cmd.CommandText = "SELECT Id, CategoryId, Amount, Month, Year, AlertSentAt FROM Budgets";
    using var r = cmd.ExecuteReader();
    while (r.Read())
        Console.WriteLine($"  id={r["Id"]}  cat={r["CategoryId"]}  amt={r["Amount"]}  month={r["Month"]}  year={r["Year"]}  alertSentAt={r["AlertSentAt"]}");
}

Console.WriteLine("\n=== EXPENSE TRANSACTIONS (last 10) ===");
using (var cmd2 = conn.CreateCommand())
{
    cmd2.CommandText = "SELECT Id, CategoryId, Amount, Type, Date FROM Transactions WHERE Type = 2 ORDER BY Date DESC LIMIT 10";
    using var r2 = cmd2.ExecuteReader();
    while (r2.Read())
        Console.WriteLine($"  id={r2["Id"]}  cat={r2["CategoryId"]}  amt={r2["Amount"]}  type={r2["Type"]}  date={r2["Date"]}");
}

Console.WriteLine("\n=== TOTALS BY CATEGORY (Feb 2026 expenses) ===");
using (var cmd3 = conn.CreateCommand())
{
    cmd3.CommandText = @"SELECT CategoryId, SUM(Amount) as Total, COUNT(*) as Cnt 
                         FROM Transactions 
                         WHERE Type = 2 AND Date >= '2026-02-01' AND Date < '2026-03-01' 
                         GROUP BY CategoryId";
    using var r3 = cmd3.ExecuteReader();
    while (r3.Read())
        Console.WriteLine($"  cat={r3["CategoryId"]}  total={r3["Total"]}  count={r3["Cnt"]}");
}
