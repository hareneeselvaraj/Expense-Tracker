using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExpenseTracker.Models;

public class Investment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? AssetType { get; set; }  // Stock, MutualFund, Gold, FD, RD, PPF, Silver

    [Column(TypeName = "decimal(18,4)")]
    public decimal? Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? BuyPrice { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal InvestedAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentValue { get; set; }

    [MaxLength(100)]
    public string? Platform { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime? DateInvested { get; set; }

    /// <summary>
    /// ROI = ((CurrentValue - InvestedAmount) / InvestedAmount) * 100
    /// </summary>
    [NotMapped]
    public decimal ROI => InvestedAmount != 0
        ? ((CurrentValue - InvestedAmount) / InvestedAmount) * 100
        : 0;

    // Navigation
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
