namespace ExpenseTracker.DTOs.Statement;

public class ParsedStatementRowDto
{
    public int RowIndex { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Type { get; set; } = "Expense";          // Income | Expense
    public string Channel { get; set; } = "Offline";       // Online | Offline
    public string? BankMode { get; set; }                   // GPay | NetBanking | Debit | Credit
    public bool IsDuplicate { get; set; }
}

public class StatementPreviewDto
{
    public string FileName { get; set; } = string.Empty;
    public int TotalRows { get; set; }
    public int DuplicateCount { get; set; }
    public List<string> DetectedColumns { get; set; } = new();
    public List<ParsedStatementRowDto> Rows { get; set; } = new();
}

public class ConfirmStatementDto
{
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }       // null → use "Uncategorized"
    public List<int> SelectedRowIndices { get; set; } = new();
    public List<ParsedStatementRowDto> Rows { get; set; } = new();
}
