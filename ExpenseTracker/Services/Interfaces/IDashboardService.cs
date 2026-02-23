using ExpenseTracker.DTOs.Dashboard;

namespace ExpenseTracker.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardResponseDto> GetDashboardAsync(Guid userId);
}
