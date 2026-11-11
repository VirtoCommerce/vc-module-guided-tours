using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VirtoCommerce.GuidedTours.Web.Services;
using VirtoCommerce.Platform.Core.Modularity;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public sealed class TourDefinitionServiceTests : IDisposable
{
    private const string ValidTour = """{ "id": "orders.basics", "version": 1, "steps": [ { "text": "HELLO" } ] }""";

    private readonly string _root = Directory.CreateTempSubdirectory("guided-tours-tests").FullName;
    private readonly List<ManifestModuleInfo> _modules = [];

    public void Dispose()
    {
        Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public void GetTours_ReturnsToursOfEveryModuleForTheApp_WithModuleId()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);
        AddModule("Module.B").WithTour("app-one", "b.json", ValidTour.Replace("orders.basics", "catalog.basics"));

        var tours = CreateService().GetTours("app-one");

        Assert.Equal(["orders.basics", "catalog.basics"], tours.Select(x => x.Value<string>("id")));
        Assert.Equal(["Module.A", "Module.B"], tours.Select(x => x.Value<string>("moduleId")));
    }

    [Fact]
    public void GetTours_IgnoresToursOfOtherApps()
    {
        AddModule("Module.A").WithTour("app-two", "a.json", ValidTour);

        Assert.Empty(CreateService().GetTours("app-one"));
    }

    [Theory]
    [InlineData("""{ "version": 1, "steps": [ {} ] }""")]
    [InlineData("""{ "id": "x", "version": 0, "steps": [ {} ] }""")]
    [InlineData("""{ "id": "x", "version": "1", "steps": [ {} ] }""")]
    [InlineData("""{ "id": "x", "version": 1, "steps": [] }""")]
    [InlineData("not json")]
    public void GetTours_SkipsInvalidDefinitions(string content)
    {
        AddModule("Module.A")
            .WithTour("app-one", "bad.json", content)
            .WithTour("app-one", "good.json", ValidTour);

        var tours = CreateService().GetTours("app-one");

        Assert.Equal(["orders.basics"], tours.Select(x => x.Value<string>("id")));
    }

    [Theory]
    [InlineData("../app-one")]
    [InlineData("")]
    [InlineData(null)]
    public void GetTours_RejectsAppIdsThatAreNotPlainNames(string appId)
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);

        Assert.Empty(CreateService().GetTours(appId));
    }

    [Fact]
    public void GetTours_ReturnsCopiesThatCallersCannotCorrupt()
    {
        AddModule("Module.A").WithTour("app-one", "a.json", ValidTour);
        var service = CreateService();

        service.GetTours("app-one")[0]["id"] = "changed";

        Assert.Equal("orders.basics", service.GetTours("app-one")[0].Value<string>("id"));
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
            var folder = Path.Combine(path, "tours", appId);
            Directory.CreateDirectory(folder);
            File.WriteAllText(Path.Combine(folder, fileName), content);

            return this;
        }
    }
}
