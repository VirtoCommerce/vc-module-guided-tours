using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Validation;

namespace VirtoCommerce.GuidedTours.Core;

public static class TourCatalog
{
    public const string CopySuffix = "-copy";
    public const string CopyTitleSuffix = " (copy)";

    /// <summary>
    /// Module tours first, then custom tours by id. A tour without a switch is on.
    /// A custom tour whose id a module tour uses is conflicting: the module tour wins.
    /// </summary>
    public static IList<TourInfo> Merge(IEnumerable<ModuleTour> moduleTours, IEnumerable<CustomTour> customTours, IDictionary<string, bool> switches)
    {
        var result = new List<TourInfo>();
        var moduleTourIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var moduleTour in moduleTours)
        {
            moduleTourIds.Add(moduleTour.Id);
            result.Add(new TourInfo
            {
                Tour = moduleTour.Tour,
                Source = TourSource.Module,
                ModuleId = moduleTour.ModuleId,
                IsEnabled = IsEnabled(switches, moduleTour.Id),
            });
        }

        foreach (var customTour in customTours.OrderBy(x => x.TourId, StringComparer.Ordinal))
        {
            result.Add(new TourInfo
            {
                Tour = customTour.Tour,
                Source = TourSource.Custom,
                IsEnabled = IsEnabled(switches, customTour.TourId),
                IsConflicting = moduleTourIds.Contains(customTour.TourId),
                ModifiedDate = customTour.ModifiedDate ?? customTour.CreatedDate,
                ModifiedBy = customTour.ModifiedBy ?? customTour.CreatedBy,
            });
        }

        return result;
    }

    /// <summary>
    /// Tours of the app that are on, not conflicting and meant for a user created at <paramref name="userCreatedDate"/>,
    /// as copies; a module tour also carries its <c>moduleId</c>.
    /// </summary>
    public static IList<JObject> SelectForUsers(IEnumerable<TourInfo> tours, string appId, DateTime? userCreatedDate)
    {
        return tours
            .Where(x => x.IsEnabled && !x.IsConflicting && x.AppId == appId && TourAudience.IsRelevantFor(x.Tour, userCreatedDate))
            .Select(x =>
            {
                var tour = (JObject)x.Tour.DeepClone();
                if (x.ModuleId != null)
                {
                    tour["moduleId"] = x.ModuleId;
                }

                return tour;
            })
            .ToList();
    }

    /// <summary>
    /// The tour with the id; for a conflicting id, the module tour.
    /// </summary>
    public static TourInfo Find(IEnumerable<TourInfo> tours, string id)
    {
        var matches = tours.Where(x => x.Id == id).ToList();

        return matches.FirstOrDefault(x => x.Source == TourSource.Module) ?? matches.FirstOrDefault();
    }

    /// <summary>
    /// <c>{id}-copy</c>, then <c>{id}-copy-2</c>, <c>{id}-copy-3</c> and so on, the first one not taken.
    /// The id is shortened when the copy id would be longer than the id limit.
    /// </summary>
    public static string CreateCopyId(string id, Func<string, bool> isTaken)
    {
        for (var number = 1; ; number++)
        {
            var suffix = number == 1 ? CopySuffix : $"{CopySuffix}-{number}";
            var maxBaseLength = TourValidator.MaxIdLength - suffix.Length;
            var candidate = (id.Length > maxBaseLength ? id[..maxBaseLength] : id) + suffix;

            if (!isTaken(candidate))
            {
                return candidate;
            }
        }
    }

    /// <summary>
    /// A copy of the tour with the new id and <c> (copy)</c> appended to every title text.
    /// </summary>
    public static JObject CreateCopy(JObject tour, string newId)
    {
        var copy = (JObject)tour.DeepClone();
        copy["id"] = newId;

        if (copy["title"] is JObject title)
        {
            foreach (var text in title.Properties().Where(x => x.Value.Type == JTokenType.String))
            {
                text.Value = text.Value.Value<string>() + CopyTitleSuffix;
            }
        }

        return copy;
    }

    private static bool IsEnabled(IDictionary<string, bool> switches, string tourId)
    {
        return !switches.TryGetValue(tourId, out var isEnabled) || isEnabled;
    }
}
