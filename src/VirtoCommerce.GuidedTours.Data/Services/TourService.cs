using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.GuidedTours.Core.Validation;
using VirtoCommerce.GuidedTours.Data.Caching;
using VirtoCommerce.GuidedTours.Data.Models;
using VirtoCommerce.GuidedTours.Data.Repositories;
using VirtoCommerce.Platform.Core.Caching;
using VirtoCommerce.Platform.Core.Common;
using VirtoCommerce.Platform.Core.Settings;

namespace VirtoCommerce.GuidedTours.Data.Services;

public class TourService(
    Func<IGuidedToursRepository> repositoryFactory,
    ITourDefinitionService tourDefinitionService,
    IPlatformMemoryCache platformMemoryCache,
    ISettingsManager settingsManager)
    : ITourService
{
    public virtual async Task<IList<JObject>> GetUserToursAsync(string appId, DateTime? userCreatedDate)
    {
        if (!TourValidator.IsValidAppId(appId) || !await settingsManager.GetValueAsync<bool>(ModuleConstants.Settings.General.Enabled))
        {
            return [];
        }

        var tours = await GetAllToursAsync();

        return TourCatalog.SelectForUsers(tours, appId, userCreatedDate);
    }

    public virtual async Task<IList<TourInfo>> GetToursAsync(string appId = null)
    {
        var tours = await GetAllToursAsync();

        return tours
            .Where(x => string.IsNullOrEmpty(appId) || x.AppId == appId)
            .Select(x => (TourInfo)x.Clone())
            .ToList();
    }

    public virtual async Task<TourInfo> GetTourAsync(string id)
    {
        var tours = await GetAllToursAsync();

        return (TourInfo)TourCatalog.Find(tours, id)?.Clone();
    }

    public virtual async Task<TourChangeResult> CreateAsync(JToken tour)
    {
        var problems = TourValidator.Validate(tour);
        if (problems.Count > 0)
        {
            return TourChangeResult.Invalid(problems);
        }

        var tourObject = (JObject)tour;
        var id = tourObject.Value<string>("id");

        var tours = await GetAllToursAsync();
        if (tours.Any(x => x.Id == id))
        {
            return TourChangeResult.Invalid("id", TourProblemMessages.IdTaken);
        }

        using (var repository = repositoryFactory())
        {
            var model = AbstractTypeFactory<CustomTour>.TryCreateInstance();
            model.TourId = id;
            model.AppId = tourObject.Value<string>("appId");
            model.Tour = tourObject;

            repository.Add(AbstractTypeFactory<CustomTourEntity>.TryCreateInstance().FromModel(model, new PrimaryKeyResolvingMap()));
            await SetSwitchAsync(repository, id, isEnabled: false);

            await repository.UnitOfWork.CommitAsync();
        }

        GuidedToursCacheRegion.ExpireRegion();

        return TourChangeResult.Succeeded(await GetCustomTourAsync(id));
    }

    public virtual async Task<TourChangeResult> UpdateAsync(string id, JToken tour)
    {
        var tours = await GetAllToursAsync();
        var isModuleTourId = IsModuleTourId(tours, id);

        string newId;
        using (var repository = repositoryFactory())
        {
            var entity = await repository.CustomTours.FirstOrDefaultAsync(x => x.TourId == id);
            if (entity is null)
            {
                return isModuleTourId
                    ? TourChangeResult.Invalid(string.Empty, TourProblemMessages.ModuleTourReadOnly)
                    : TourChangeResult.NotFound();
            }

            var problems = TourValidator.Validate(tour);
            if (problems.Count > 0)
            {
                return TourChangeResult.Invalid(problems);
            }

            var tourObject = (JObject)tour;
            newId = tourObject.Value<string>("id");
            if (newId != id && tours.Any(x => x.Id == newId))
            {
                return TourChangeResult.Invalid("id", TourProblemMessages.IdTaken);
            }

            var model = entity.ToModel(AbstractTypeFactory<CustomTour>.TryCreateInstance());
            model.TourId = newId;
            model.AppId = tourObject.Value<string>("appId");
            model.Tour = tourObject;

            AbstractTypeFactory<CustomTourEntity>.TryCreateInstance().FromModel(model, new PrimaryKeyResolvingMap()).Patch(entity);

            if (newId != id)
            {
                await MoveSwitchAsync(repository, id, newId, keepOldSwitch: isModuleTourId);
            }

            await repository.UnitOfWork.CommitAsync();
        }

        GuidedToursCacheRegion.ExpireRegion();

        return TourChangeResult.Succeeded(await GetCustomTourAsync(newId));
    }

    public virtual async Task<TourChangeResult> DeleteAsync(string id)
    {
        var tours = await GetAllToursAsync();
        var isModuleTourId = IsModuleTourId(tours, id);

        using (var repository = repositoryFactory())
        {
            var entity = await repository.CustomTours.FirstOrDefaultAsync(x => x.TourId == id);
            if (entity is null)
            {
                return isModuleTourId
                    ? TourChangeResult.Invalid(string.Empty, TourProblemMessages.ModuleTourReadOnly)
                    : TourChangeResult.NotFound();
            }

            repository.Remove(entity);

            if (!isModuleTourId)
            {
                var tourSwitch = await repository.TourSwitches.FirstOrDefaultAsync(x => x.TourId == id);
                if (tourSwitch != null)
                {
                    repository.Remove(tourSwitch);
                }
            }

            await repository.UnitOfWork.CommitAsync();
        }

        GuidedToursCacheRegion.ExpireRegion();

        return TourChangeResult.Succeeded();
    }

    public virtual async Task<TourChangeResult> CopyAsync(string id)
    {
        var tours = await GetAllToursAsync();
        var source = TourCatalog.Find(tours, id);
        if (source is null)
        {
            return TourChangeResult.NotFound();
        }

        var copyId = TourCatalog.CreateCopyId(id, candidate => tours.Any(x => x.Id == candidate));

        return await CreateAsync(TourCatalog.CreateCopy(source.Tour, copyId));
    }

    public virtual async Task<bool> SetEnabledAsync(string id, bool isEnabled)
    {
        var tours = await GetAllToursAsync();
        if (!tours.Any(x => x.Id == id))
        {
            return false;
        }

        using (var repository = repositoryFactory())
        {
            await SetSwitchAsync(repository, id, isEnabled);
            await repository.UnitOfWork.CommitAsync();
        }

        GuidedToursCacheRegion.ExpireRegion();

        return true;
    }

    protected virtual Task<IList<TourInfo>> GetAllToursAsync()
    {
        var cacheKey = CacheKey.With(GetType(), nameof(GetAllToursAsync));

        return platformMemoryCache.GetOrCreateExclusiveAsync(cacheKey, async cacheOptions =>
        {
            cacheOptions.AddExpirationToken(GuidedToursCacheRegion.CreateChangeToken());

            using var repository = repositoryFactory();

            var customTourEntities = await repository.CustomTours.AsNoTracking().ToListAsync();
            var customTours = customTourEntities.Select(x => x.ToModel(AbstractTypeFactory<CustomTour>.TryCreateInstance()));

            var switchEntities = await repository.TourSwitches.AsNoTracking().ToListAsync();
            var switches = switchEntities.ToDictionary(x => x.TourId, x => x.IsEnabled, StringComparer.Ordinal);

            return TourCatalog.Merge(tourDefinitionService.GetTours(), customTours, switches);
        });
    }

    private async Task<TourInfo> GetCustomTourAsync(string id)
    {
        var tours = await GetAllToursAsync();

        return (TourInfo)tours.FirstOrDefault(x => x.Source == TourSource.Custom && x.Id == id)?.Clone();
    }

    private static bool IsModuleTourId(IEnumerable<TourInfo> tours, string id)
    {
        return tours.Any(x => x.Source == TourSource.Module && x.Id == id);
    }

    private static async Task SetSwitchAsync(IGuidedToursRepository repository, string tourId, bool isEnabled)
    {
        var tourSwitch = await repository.TourSwitches.FirstOrDefaultAsync(x => x.TourId == tourId);
        if (tourSwitch is null)
        {
            repository.Add(new TourSwitchEntity { TourId = tourId, IsEnabled = isEnabled });
        }
        else
        {
            tourSwitch.IsEnabled = isEnabled;
        }
    }

    private static async Task MoveSwitchAsync(IGuidedToursRepository repository, string oldId, string newId, bool keepOldSwitch)
    {
        var oldSwitch = await repository.TourSwitches.FirstOrDefaultAsync(x => x.TourId == oldId);
        var staleSwitch = await repository.TourSwitches.FirstOrDefaultAsync(x => x.TourId == newId);

        if (oldSwitch is null)
        {
            if (staleSwitch != null)
            {
                repository.Remove(staleSwitch);
            }

            return;
        }

        if (!keepOldSwitch)
        {
            repository.Remove(oldSwitch);
        }

        if (staleSwitch is null)
        {
            repository.Add(new TourSwitchEntity { TourId = newId, IsEnabled = oldSwitch.IsEnabled });
        }
        else
        {
            staleSwitch.IsEnabled = oldSwitch.IsEnabled;
        }
    }
}
