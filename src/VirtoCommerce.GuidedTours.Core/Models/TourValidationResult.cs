using System.Collections.Generic;

namespace VirtoCommerce.GuidedTours.Core.Models;

public class TourValidationResult
{
    public IList<TourProblem> Problems { get; set; } = [];
}
