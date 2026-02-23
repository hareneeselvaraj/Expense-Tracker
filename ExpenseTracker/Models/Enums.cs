namespace ExpenseTracker.Models;

public enum AccountType
{
    Bank,
    CreditCard,
    Wallet
}

public enum CategoryType
{
    Income,
    Expense,
    Investment
}

public enum TransactionType
{
    Income,
    Expense,
    Investment,
    Transfer
}

public enum OnlineOffline
{
    Online,
    Offline
}

public enum BankMode
{
    GPay,
    NetBanking,
    Debit,
    Credit
}
