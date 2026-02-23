using MailKit.Net.Smtp;
using MimeKit;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Services.Implementations;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendBudgetAlertAsync(string recipientEmail, string recipientName,
        string categoryName, decimal budgetAmount, decimal amountSpent,
        int month, int year)
    {
        var smtp = _config.GetSection("SmtpSettings");
        var senderEmail = smtp["SenderEmail"]!;
        var senderName = smtp["SenderName"] ?? "Expense Tracker";
        var host = smtp["Host"]!;
        var port = int.Parse(smtp["Port"] ?? "587");
        var appPassword = smtp["AppPassword"]!.Replace(" ", "");

        Console.WriteLine($"[EMAIL] Preparing to send budget alert to {recipientEmail}");

        var monthName = new DateTime(year, month, 1).ToString("MMMM yyyy");
        var overBy = amountSpent - budgetAmount;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(recipientName, recipientEmail));
        message.Subject = $"⚠️ Budget Alert: {categoryName} exceeded for {monthName}";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
            <div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #1a1d27; color: #e4e6ef; border-radius: 12px; overflow: hidden;"">
                <div style=""background: linear-gradient(135deg, #6366f1, #ec4899); padding: 24px 28px;"">
                    <h1 style=""margin: 0; font-size: 20px; color: #fff;"">⚠️ Budget Alert</h1>
                </div>
                <div style=""padding: 28px;"">
                    <p style=""margin: 0 0 8px; color: #8b8fa3; font-size: 14px;"">Hi {recipientName},</p>
                    <p style=""margin: 0 0 20px; font-size: 15px; line-height: 1.5;"">
                        Your spending in <strong style=""color: #6366f1;"">{categoryName}</strong> has exceeded the budget for <strong>{monthName}</strong>.
                    </p>
                    <div style=""background: #0f1117; border-radius: 8px; padding: 20px; margin-bottom: 20px;"">
                        <table style=""width: 100%; border-collapse: collapse; font-size: 14px;"">
                            <tr>
                                <td style=""padding: 8px 0; color: #8b8fa3;"">Budget</td>
                                <td style=""padding: 8px 0; text-align: right; font-weight: 700;"">₹{budgetAmount:N2}</td>
                            </tr>
                            <tr>
                                <td style=""padding: 8px 0; color: #8b8fa3;"">Spent</td>
                                <td style=""padding: 8px 0; text-align: right; font-weight: 700; color: #ef4444;"">₹{amountSpent:N2}</td>
                            </tr>
                            <tr style=""border-top: 1px solid #2a2e3d;"">
                                <td style=""padding: 8px 0; color: #8b8fa3;"">Over by</td>
                                <td style=""padding: 8px 0; text-align: right; font-weight: 700; color: #ef4444;"">₹{overBy:N2}</td>
                            </tr>
                        </table>
                    </div>
                    <p style=""margin: 0; font-size: 13px; color: #8b8fa3;"">
                        Review your spending in the <a href=""http://localhost:5173/budgets"" style=""color: #6366f1; text-decoration: none;"">Budgets</a> page.
                    </p>
                </div>
                <div style=""padding: 16px 28px; background: #141720; font-size: 12px; color: #8b8fa3; text-align: center;"">
                    Expense Tracker — Automated Budget Alert
                </div>
            </div>"
        };

        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(senderEmail, appPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Budget alert email sent to {Email} for category {Category}", recipientEmail, categoryName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send budget alert email to {Email}", recipientEmail);
            throw; // Let caller decide whether to retry
        }
    }
}
