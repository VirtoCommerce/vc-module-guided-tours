using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.GuidedTours.Core.Validation;
using VirtoCommerce.Platform.Core.Modularity;

namespace VirtoCommerce.GuidedTours.Web.Services;

public class TourDefinitionService : ITourDefinitionService
{
    private readonly IModuleService _moduleService;
    private readonly ILogger<TourDefinitionService> _logger;
    private readonly Lazy<List<ModuleTour>> _tours;

    public TourDefinitionService(IModuleService moduleService, ILogger<TourDefinitionService> logger)
    {
        _moduleService = moduleService;
        _logger = logger;

        // Installed modules only change on a platform restart, so the result is stable for the process lifetime.
        _tours = new Lazy<List<ModuleTour>>(LoadTours);
    }

    public IList<ModuleTour> GetTours()
    {
        return _tours.Value
            .Select(x => new ModuleTour { ModuleId = x.ModuleId, Tour = (JObject)x.Tour.DeepClone() })
            .ToList();
    }

    private List<ModuleTour> LoadTours()
    {
        var result = new List<ModuleTour>();
        var moduleIdByTourId = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var module in _moduleService.GetInstalledModules().Where(x => !string.IsNullOrEmpty(x.FullPhysicalPath)))
        {
            var toursFolder = Path.Combine(module.FullPhysicalPath, ModuleConstants.ToursFolder);
            if (!Directory.Exists(toursFolder))
            {
                continue;
            }

            foreach (var appFolder in Directory.EnumerateDirectories(toursFolder).Order(StringComparer.Ordinal))
            {
                var appId = Path.GetFileName(appFolder);

                foreach (var file in Directory.EnumerateFiles(appFolder, "*.json").Order(StringComparer.Ordinal))
                {
                    var tour = ReadTour(file, appId);
                    if (tour is null)
                    {
                        continue;
                    }

                    var tourId = tour.Value<string>("id");
                    if (moduleIdByTourId.TryGetValue(tourId, out var ownerModuleId))
                    {
                        _logger.LogWarning("Skipping tour {File}: module {ModuleId} already ships a tour with id {TourId}", file, ownerModuleId, tourId);
                        continue;
                    }

                    moduleIdByTourId[tourId] = module.Id;
                    result.Add(new ModuleTour { ModuleId = module.Id, Tour = tour });
                }
            }
        }

        return result;
    }

    private JObject ReadTour(string file, string appId)
    {
        try
        {
            var token = TourJson.Parse(File.ReadAllText(file));
            if (token is JObject tour)
            {
                tour["appId"] = appId;
            }

            var problems = TourValidator.Validate(token);
            if (problems.Count == 0)
            {
                return (JObject)token;
            }

            _logger.LogWarning("Skipping invalid tour {File}: {Problems}", file, string.Join("; ", problems.Select(FormatProblem)));
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            _logger.LogWarning(ex, "Skipping unreadable tour {File}", file);
        }

        return null;
    }

    private static string FormatProblem(TourProblem problem)
    {
        return problem.Path.Length == 0 ? problem.Message : $"{problem.Path}: {problem.Message}";
    }
}
