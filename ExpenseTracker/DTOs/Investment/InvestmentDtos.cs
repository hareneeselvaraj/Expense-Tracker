using System.ComponentModel.DataAnnotations;

namespace ExpenseTracker.DTOs.Investment;

public class CreateInvestmentDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? AssetType { get; set; }

    public decimal? Quantity { get; set; }
    public decimal? BuyPrice { get; set; }

    [Required]
    public decimal InvestedAmount { get; set; }

    public decimal CurrentValue { get; set; }

    [MaxLength(100)]
    public string? Platform { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime? DateInvested { get; set; }
}

public class UpdateInvestmentDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(50)]
    public string? AssetType { get; set; }

    public decimal? Quantity { get; set; }
    public decimal? BuyPrice { get; set; }
    public decimal? InvestedAmount { get; set; }
    public decimal? CurrentValue { get; set; }

    [MaxLength(100)]
    public string? Platform { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime? DateInvested { get; set; }
}

public class InvestmentResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AssetType { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? BuyPrice { get; set; }
    public decimal InvestedAmount { get; set; }
    public decimal CurrentValue { get; set; }
    public string? Platform { get; set; }
    public string? Notes { get; set; }
    public DateTime? DateInvested { get; set; }
    public decimal ROI { get; set; }
}
