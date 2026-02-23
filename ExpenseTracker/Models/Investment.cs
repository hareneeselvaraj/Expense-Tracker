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

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal InvestedAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal CurrentValue { get; set; }

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
