using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Web.Services;
using VirtoCommerce.Platform.Core.Modularity;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public sealed class TourDefinitionServiceTests : IDisposable
{
    private const string ValidTour = """
        {
          "id": "orders.basics",
          "version": 1,
          "title": { "en-US": "Orders" },
          "trigger": { "appReady": true },
          "steps": [ { "text": { "en-US": "Hello" } } ]
        }
        """;

    private readonly string _root = Directory.CreateTempSubdirectory("guided-tours-tests").FullName;
    private readonly List<ManifestModuleInfo> _modules = [];

    public void Dispose()
    {
        Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public void GetTours_ReturnsToursOfEveryModuleAndApp_WithModuleIdAndAppIdFromTheFolder()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);
        AddModule("Module.B").WithTour("app-two", "b.json", ValidTour.Replace("orders.basics", "catalog.basics"));

        var tours = CreateService().GetTours();

        Assert.Equal(["orders.basics", "catalog.basics"], tours.Select(x => x.Id));
        Assert.Equal(["Module.A", "Module.B"], tours.Select(x => x.ModuleId));
        Assert.Equal(["app-one", "app-two"], tours.Select(x => x.Tour.Value<string>("appId")));
    }

    [Fact]
    public void GetTours_SetsAppIdFromTheFolder_OverTheOneInTheFile()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour.Replace("\"version\": 1", "\"version\": 1, \"appId\": \"other-app\""));

        var tour = Assert.Single(CreateService().GetTours());

        Assert.Equal("app-one", tour.AppId);
    }

    [Fact]
    public void GetTours_DoesNotAddModuleIdToTheTourItself()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);

        var tour = Assert.Single(CreateService().GetTours());

        Assert.Null(tour.Tour["moduleId"]);
    }

    [Theory]
    [InlineData("""{ "version": 1, "title": { "en-US": "T" }, "trigger": { "appReady": true }, "steps": [ { "text": { "en-US": "T" } } ] }""")]
    [InlineData("""{ "id": "x", "version": 0, "title": { "en-US": "T" }, "trigger": { "appReady": true }, "steps": [ { "text": { "en-US": "T" } } ] }""")]
    [InlineData("""{ "id": "x", "version": "1", "title": { "en-US": "T" }, "trigger": { "appReady": true }, "steps": [ { "text": { "en-US": "T" } } ] }""")]
    [InlineData("""{ "id": "x", "version": 1, "title": { "en-US": "T" }, "trigger": { "appReady": true }, "steps": [] }""")]
    [InlineData("""{ "id": "x", "version": 1, "title": "orders.tour.title", "trigger": { "appReady": true }, "steps": [ { "text": { "en-US": "T" } } ] }""")]
    [InlineData("""{ "id": "x", "version": 1, "title": { "en-US": "T" }, "trigger": { "appReady": true }, "steps": [ { "text": { "en-US": "T" } } ], "extra": 1 }""")]
    [InlineData("not json")]
    [InlineData("[]")]
    public void GetTours_SkipsInvalidDefinitions(string content)
    {
        AddModule("Module.A")
            .WithTour("app-one", "bad.json", content)
            .WithTour("app-one", "good.json", ValidTour);

        var tours = CreateService().GetTours();

        Assert.Equal(["orders.basics"], tours.Select(x => x.Id));
    }

    [Fact]
    public void GetTours_SkipsAFolderThatIsNotAValidAppId()
    {
        AddModule("Module.A").WithTour("Admin_Shell", "a.json", ValidTour);

        Assert.Empty(CreateService().GetTours());
    }

    [Fact]
    public void GetTours_SkipsATourWhoseIdAnEarlierModuleShips()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);
        AddModule("Module.B").WithTour("app-two", "b.json", ValidTour);

        var tour = Assert.Single(CreateService().GetTours());

        Assert.Equal("Module.A", tour.ModuleId);
    }

    [Fact]
    public void GetTours_KeepsDateLikeStringsAsWritten()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour.Replace("\"version\": 1", "\"version\": 1, \"publishedAt\": \"2026-11-01\""));

        var tour = Assert.Single(CreateService().GetTours());

        Assert.Equal(JTokenType.String, tour.Tour["publishedAt"]!.Type);
        Assert.Equal("2026-11-01", tour.Tour.Value<string>("publishedAt"));
    }

    [Fact]
    public void GetTours_ReturnsCopiesThatCallersCannotCorrupt()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);
        var service = CreateService();

        service.GetTours()[0].Tour["id"] = "changed";

        Assert.Equal("orders.basics", service.GetTours()[0].Id);
    }

    private TourDefinitionService CreateService()
    {
        var moduleService = new Mock<IModuleService>();
        moduleService.Setup(x => x.GetInstalledModules()).Returns(_modules);

        return new TourDefinitionService(moduleService.Object, NullLogger<TourDefinitionService>.Instance);
    }

    private ModuleFolder AddModule(string id)
    {
        var path = Path.Combine(_root, id);
        Directory.CreateDirectory(path);
        var module = new ManifestModuleInfo().LoadFromManifest(new ModuleManifest { Id = id, Version = "1.0.0", PlatformVersion = "3.0.0" });
        module.FullPhysicalPath = path;
        _modules.Add(module);

        return new ModuleFolder(path);
    }

    private sealed class ModuleFolder(string path)
    {
        public ModuleFolder WithTour(string appId, string fileName, string content)
        {
            var folder = Path.Combine(path, ModuleConstants.ToursFolder, appId);
            Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(folder, fileName), content);

            return this;
        }
    }
}
