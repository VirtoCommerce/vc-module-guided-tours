using System.Linq;
using VirtoCommerce.GuidedTours.Data.Models;
using VirtoCommerce.Platform.Core.Common;

namespace VirtoCommerce.GuidedTours.Data.Repositories;

public interface IGuidedToursRepository : IRepository
{
    IQueryable<CustomTourEntity> CustomTours { get; }

    IQueryable<TourSwitchEntity> TourSwitches { get; }
}
