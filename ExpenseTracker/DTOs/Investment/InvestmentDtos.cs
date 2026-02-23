using System.ComponentModel.DataAnnotations;

namespace ExpenseTracker.DTOs.Investment;

public class CreateInvestmentDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public decimal InvestedAmount { get; set; }

    public decimal CurrentValue { get; set; }
}

public class UpdateInvestmentDto
{
    [MaxLength(200)]
    public string? Name { get; set; }
    public decimal? InvestedAmount { get; set; }
    public decimal? CurrentValue { get; set; }
}

public class InvestmentResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal InvestedAmount { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal ROI { get; set; }
}
