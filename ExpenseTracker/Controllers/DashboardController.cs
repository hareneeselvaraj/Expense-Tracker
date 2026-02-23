using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ExpenseTracker.Services.Interfaces;

namespace ExpenseTracker.Controllers;

[Route("api/[controller]")]
[Authorize]
public class DashboardController : BaseApiController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>Get summary dashboard: totals, monthly breakdown, category breakdown, accounts.</summary>
    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await _dashboardService.GetDashboardAsync(GetUserId());
        return Ok(result);
    }
}
