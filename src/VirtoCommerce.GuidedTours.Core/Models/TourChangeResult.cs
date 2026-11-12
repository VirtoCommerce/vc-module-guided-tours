using System.Collections.Generic;

namespace VirtoCommerce.GuidedTours.Core.Models;

public enum TourChangeStatus
{
    Succeeded,
    NotFound,
    Invalid,
}

public class TourChangeResult
{
    public TourChangeStatus Status { get; set; }

    public TourInfo Tour { get; set; }

    public IList<TourProblem> Problems { get; set; } = [];

    public static TourChangeResult Succeeded(TourInfo tour = null)
    {
        return new TourChangeResult { Status = TourChangeStatus.Succeeded, Tour = tour };
    }

    public static TourChangeResult NotFound()
    {
        return new TourChangeResult { Status = TourChangeStatus.NotFound };
    }

    public static TourChangeResult Invalid(IList<TourProblem> problems)
    {
        return new TourChangeResult { Status = TourChangeStatus.Invalid, Problems = problems };
    }

    public static TourChangeResult Invalid(string path, string message)
    {
        return Invalid([new TourProblem(path, message)]);
    }
}
