using System.Linq;
using VirtoCommerce.GuidedTours.Data.Models;
using VirtoCommerce.Platform.Core.Domain;
using VirtoCommerce.Platform.Data.Infrastructure;

namespace VirtoCommerce.GuidedTours.Data.Repositories;

public class GuidedToursRepository(GuidedToursDbContext dbContext, IUnitOfWork unitOfWork = null)
    : DbContextRepositoryBase<GuidedToursDbContext>(dbContext, unitOfWork), IGuidedToursRepository
{
    public IQueryable<CustomTourEntity> CustomTours => DbContext.Set<CustomTourEntity>();

    public IQueryable<TourSwitchEntity> TourSwitches => DbContext.Set<TourSwitchEntity>();
}
