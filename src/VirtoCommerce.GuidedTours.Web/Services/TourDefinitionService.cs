using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.Platform.Core.Modularity;

namespace VirtoCommerce.GuidedTours.Web.Services;

public partial class TourDefinitionService(IModuleService moduleService, ILogger<TourDefinitionService> logger) : ITourDefinitionService
{
    private readonly ConcurrentDictionary<string, IList<JObject>> _cache = new(StringComparer.OrdinalIgnoreCase);

    [GeneratedRegex("^[a-z0-9][a-z0-9-]*$", RegexOptions.IgnoreCase)]
    private static partial Regex AppIdRegex();

    public IList<JObject> GetTours(string appId)
    {
        if (string.IsNullOrEmpty(appId) || !AppIdRegex().IsMatch(appId))
        {
            return [];
        }

        // Installed modules only change on a platform restart, so the result is stable for the process lifetime.
        return _cache.GetOrAdd(appId, LoadTours)
            .Select(x => (JObject)x.DeepClone())
            .ToList();
    }

    private List<JObject> LoadTours(string appId)
    {
        var result = new List<JObject>();

        foreach (var module in moduleService.GetInstalledModules().Where(x => !string.IsNullOrEmpty(x.FullPhysicalPath)))
        {
            var folder = Path.Combine(module.FullPhysicalPath, ModuleConstants.ToursFolder, appId);
            if (!Directory.Exists(folder))
            {
                continue;
            }

            foreach (var file in Directory.EnumerateFiles(folder, "*.json").Order(StringComparer.Ordinal))
            {
                var tour = ReadTour(file);
                if (tour != null)
                {
                    tour["moduleId"] = module.Id;
                    result.Add(tour);
                }
            }
        }

        return result;
    }

    private JObject ReadTour(string file)
    {
        try
        {
            var tour = JObject.Parse(File.ReadAllText(file));

            var isValid = tour.Value<string>("id") is { Length: > 0 }
                && tour["version"]?.Type == JTokenType.Integer && tour.Value<int>("version") > 0
                && tour["steps"] is JArray { Count: > 0 };

            if (isValid)
            {
                return tour;
            }

            logger.LogWarning("Skipping tour {File}: it needs an id, a positive integer version and at least one step", file);
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            logger.LogWarning(ex, "Skipping unreadable tour {File}", file);
        }

        return null;
    }
}
