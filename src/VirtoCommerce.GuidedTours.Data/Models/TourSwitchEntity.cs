using System.ComponentModel.DataAnnotations;
using VirtoCommerce.GuidedTours.Core.Validation;
using VirtoCommerce.Platform.Core.Common;

namespace VirtoCommerce.GuidedTours.Data.Models;

/// <summary>
/// The on/off switch of one tour, module or custom. A tour without a switch is on.
/// </summary>
public class TourSwitchEntity : AuditableEntity
{
    [Required]
    [StringLength(TourValidator.MaxIdLength)]
    public string TourId { get; set; }

    public bool IsEnabled { get; set; }
}
