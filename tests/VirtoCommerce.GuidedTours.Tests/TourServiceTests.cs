using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Services;
using VirtoCommerce.GuidedTours.Data.Caching;
using VirtoCommerce.GuidedTours.Data.Repositories;
using VirtoCommerce.GuidedTours.Data.Services;
using VirtoCommerce.Platform.Caching;
using VirtoCommerce.Platform.Core.Settings;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public sealed class TourServiceTests : IDisposable
{
    private const string ModuleTourId = "orders.basics";

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly DbContextOptions<GuidedToursDbContext> _dbOptions;
    private readonly List<ModuleTour> _moduleTours = [];
    private readonly Mock<ITourDefinitionService> _tourDefinitionService = new();
    private bool _globalEnabled = true;

    public TourServiceTests()
    {
        _connection.Open();
        _dbOptions = new DbContextOptionsBuilder<GuidedToursDbContext>().UseSqlite(_connection).Options;

        using var dbContext = new GuidedToursDbContext(_dbOptions);
        dbContext.Database.EnsureCreated();

        _tourDefinitionService
            .Setup(x => x.GetTours())
            .Returns(() => _moduleTours.Select(x => new ModuleTour { ModuleId = x.ModuleId, Tour = (JObject)x.Tour.DeepClone() }).ToList());

        AddModuleTour(ModuleTourId);
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    [Fact]
    public async Task Create_StoresACustomTour_CreatedOff()
    {
        var result = await CreateService().CreateAsync(TourCatalogTests.Tour("custom.a"));

        Assert.Equal(TourChangeStatus.Succeeded, result.Status);
        Assert.Equal("custom.a", result.Tour.Id);
        Assert.Equal(TourSource.Custom, result.Tour.Source);
        Assert.False(result.Tour.IsEnabled);
        Assert.False(result.Tour.IsConflicting);
        Assert.Null(result.Tour.ModuleId);
    }

    [Fact]
    public async Task Create_InvalidTour_ReturnsTheProblems_AndStoresNothing()
    {
        var tour = TourCatalogTests.Tour("custom.a");
        tour.Remove("version");
        var service = CreateService();

        var result = await service.CreateAsync(tour);

        Assert.Equal(TourChangeStatus.Invalid, result.Status);
        Assert.Equal("version", Assert.Single(result.Problems).Path);
        Assert.Null(await service.GetTourAsync("custom.a"));
    }

    [Theory]
    [InlineData(ModuleTourId)]
    [InlineData("custom.a")]
    public async Task Create_TakenId_IsAProblemOnId(string id)
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));

        var result = await service.CreateAsync(TourCatalogTests.Tour(id));

        Assert.Equal(TourChangeStatus.Invalid, result.Status);
        var problem = Assert.Single(result.Problems);
        Assert.Equal("id", problem.Path);
        Assert.Equal(TourProblemMessages.IdTaken, problem.Message);
    }

    [Fact]
    public async Task GetTours_ListsBothKinds_FilteredByApp()
    {
        AddModuleTour("catalog.basics", appId: "other-app");
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));

        var all = await service.GetToursAsync();
        var adminShell = await service.GetToursAsync("admin-shell");

        Assert.Equal([ModuleTourId, "catalog.basics", "custom.a"], all.Select(x => x.Id));
        Assert.Equal([ModuleTourId, "custom.a"], adminShell.Select(x => x.Id));
        Assert.Equal(["Module.A", "Module.A", null], all.Select(x => x.ModuleId));
    }

    [Fact]
    public async Task GetTour_Unknown_IsNull()
    {
        Assert.Null(await CreateService().GetTourAsync("missing"));
    }

    [Fact]
    public async Task Update_ReplacesTheCustomTour_KeepingTheVersionAsSent()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));
        var tour = TourCatalogTests.Tour("custom.a");
        tour["title"]!["en-US"] = "Changed";

        var result = await service.UpdateAsync("custom.a", tour);

        Assert.Equal(TourChangeStatus.Succeeded, result.Status);
        Assert.Equal("Changed", result.Tour.Tour["title"]!.Value<string>("en-US"));
        Assert.Equal(1, result.Tour.Tour.Value<int>("version"));
        Assert.Equal("Changed", (await service.GetTourAsync("custom.a"))!.Tour["title"]!.Value<string>("en-US"));
    }

    [Fact]
    public async Task Update_ModuleTour_IsReadOnly()
    {
        var result = await CreateService().UpdateAsync(ModuleTourId, TourCatalogTests.Tour(ModuleTourId));

        Assert.Equal(TourChangeStatus.Invalid, result.Status);
        var problem = Assert.Single(result.Problems);
        Assert.Equal(string.Empty, problem.Path);
        Assert.Equal("module tours are read-only", problem.Message);
    }

    [Fact]
    public async Task Update_UnknownTour_IsNotFound()
    {
        var result = await CreateService().UpdateAsync("missing", TourCatalogTests.Tour("missing"));

        Assert.Equal(TourChangeStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task Update_InvalidTour_ReturnsTheProblems()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));
        var tour = TourCatalogTests.Tour("custom.a");
        tour["steps"] = new JArray();

        var result = await service.UpdateAsync("custom.a", tour);

        Assert.Equal(TourChangeStatus.Invalid, result.Status);
        Assert.Equal("steps", Assert.Single(result.Problems).Path);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Update_Rename_KeepsTheSwitchState(bool isEnabled)
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));
        await service.SetEnabledAsync("custom.a", isEnabled);

        var result = await service.UpdateAsync("custom.a", TourCatalogTests.Tour("custom.b"));

        Assert.Equal(TourChangeStatus.Succeeded, result.Status);
        Assert.Equal("custom.b", result.Tour.Id);
        Assert.Equal(isEnabled, result.Tour.IsEnabled);
        Assert.Null(await service.GetTourAsync("custom.a"));
        Assert.Equal(["custom.b"], (await service.GetToursAsync()).Where(x => x.Source == TourSource.Custom).Select(x => x.Id));
    }

    [Fact]
    public async Task Update_Rename_LeavesNoSwitchBehindForTheOldId()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));
        await service.SetEnabledAsync("custom.a", true);
        await service.UpdateAsync("custom.a", TourCatalogTests.Tour("custom.b"));

        var result = await service.CreateAsync(TourCatalogTests.Tour("custom.a"));

        Assert.False(result.Tour.IsEnabled);
        Assert.True((await service.GetTourAsync("custom.b"))!.IsEnabled);
    }

    [Theory]
    [InlineData(ModuleTourId)]
    [InlineData("custom.b")]
    public async Task Update_RenameToATakenId_IsAProblemOnId(string id)
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));
        await service.CreateAsync(TourCatalogTests.Tour("custom.b"));

        var result = await service.UpdateAsync("custom.a", TourCatalogTests.Tour(id));

        Assert.Equal(TourChangeStatus.Invalid, result.Status);
        Assert.Equal(("id", TourProblemMessages.IdTaken), (Assert.Single(result.Problems).Path, result.Problems[0].Message));
    }

    [Fact]
    public async Task Delete_RemovesTheCustomTour()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));

        var result = await service.DeleteAsync("custom.a");

        Assert.Equal(TourChangeStatus.Succeeded, result.Status);
        Assert.Null(await service.GetTourAsync("custom.a"));
    }

    [Fact]
    public async Task Delete_ModuleTour_IsReadOnly()
    {
        var service = CreateService();

        var result = await service.DeleteAsync(ModuleTourId);

        Assert.Equal(TourChangeStatus.Invalid, result.Status);
        Assert.Equal(("", "module tours are read-only"), (result.Problems[0].Path, result.Problems[0].Message));
        Assert.NotNull(await service.GetTourAsync(ModuleTourId));
    }

    [Fact]
    public async Task Delete_UnknownTour_IsNotFound()
    {
        Assert.Equal(TourChangeStatus.NotFound, (await CreateService().DeleteAsync("missing")).Status);
    }

    [Fact]
    public async Task Copy_ModuleTour_CreatesACustomTourOff_AndLeavesTheOriginal()
    {
        _moduleTours[0].Tour["title"] = new JObject { ["en-US"] = "Orders", ["de-DE"] = "Bestellungen" };
        var service = CreateService();

        var result = await service.CopyAsync(ModuleTourId);

        Assert.Equal(TourChangeStatus.Succeeded, result.Status);
        Assert.Equal("orders.basics-copy", result.Tour.Id);
        Assert.Equal(TourSource.Custom, result.Tour.Source);
        Assert.False(result.Tour.IsEnabled);
        Assert.Equal("Orders (copy)", result.Tour.Tour["title"]!.Value<string>("en-US"));
        Assert.Equal("Bestellungen (copy)", result.Tour.Tour["title"]!.Value<string>("de-DE"));
        Assert.Equal("admin-shell", result.Tour.AppId);

        var original = await service.GetTourAsync(ModuleTourId);
        Assert.True(original!.IsEnabled);
        Assert.Equal("Orders", original.Tour["title"]!.Value<string>("en-US"));
    }

    [Fact]
    public async Task Copy_Again_NumbersTheCopies()
    {
        var service = CreateService();

        await service.CopyAsync(ModuleTourId);
        var second = await service.CopyAsync(ModuleTourId);
        var third = await service.CopyAsync(ModuleTourId);

        Assert.Equal("orders.basics-copy-2", second.Tour.Id);
        Assert.Equal("orders.basics-copy-3", third.Tour.Id);
    }

    [Fact]
    public async Task Copy_CustomTour()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.a"));
        await service.SetEnabledAsync("custom.a", true);

        var result = await service.CopyAsync("custom.a");

        Assert.Equal("custom.a-copy", result.Tour.Id);
        Assert.False(result.Tour.IsEnabled);
        Assert.True((await service.GetTourAsync("custom.a"))!.IsEnabled);
    }

    [Fact]
    public async Task Copy_UnknownTour_IsNotFound()
    {
        Assert.Equal(TourChangeStatus.NotFound, (await CreateService().CopyAsync("missing")).Status);
    }

    [Fact]
    public async Task SetEnabled_SwitchesAModuleTourOff_ForUsers()
    {
        var service = CreateService();

        Assert.True(await service.SetEnabledAsync(ModuleTourId, false));

        Assert.False((await service.GetTourAsync(ModuleTourId))!.IsEnabled);
        Assert.Empty(await service.GetUserToursAsync("admin-shell", userCreatedDate: null));
    }

    [Fact]
    public async Task SetEnabled_UnknownTour_IsFalse()
    {
        Assert.False(await CreateService().SetEnabledAsync("missing", true));
    }

    [Fact]
    public async Task UserTours_MergeModuleToursWithCustomToursThatAreOn()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("custom.on"));
        await service.CreateAsync(TourCatalogTests.Tour("custom.off"));
        await service.SetEnabledAsync("custom.on", true);

        var tours = await service.GetUserToursAsync("admin-shell", userCreatedDate: null);

        Assert.Equal([ModuleTourId, "custom.on"], tours.Select(x => x.Value<string>("id")));
        Assert.Equal("Module.A", tours[0].Value<string>("moduleId"));
        Assert.False(tours[1].ContainsKey("moduleId"));
    }

    [Fact]
    public async Task UserTours_ModuleTourInstalledLater_WinsOverTheCustomTourWithItsId()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("shared"));
        await service.SetEnabledAsync("shared", true);
        AddModuleTour("shared", moduleId: "Module.B");
        GuidedToursCacheRegion.ExpireRegion();

        var userTours = await service.GetUserToursAsync("admin-shell", userCreatedDate: null);
        var tours = await service.GetToursAsync();

        Assert.Equal([ModuleTourId, "shared"], userTours.Select(x => x.Value<string>("id")));
        Assert.Equal("Module.B", userTours[1].Value<string>("moduleId"));
        Assert.Equal(TourSource.Module, (await service.GetTourAsync("shared"))!.Source);
        Assert.True(tours.Single(x => x.Source == TourSource.Custom).IsConflicting);
    }

    [Fact]
    public async Task ConflictingCustomTour_CanBeRenamed_AndTheModuleTourKeepsItsSwitch()
    {
        var service = CreateService();
        await service.CreateAsync(TourCatalogTests.Tour("shared"));
        AddModuleTour("shared", moduleId: "Module.B");
        GuidedToursCacheRegion.ExpireRegion();

        var result = await service.UpdateAsync("shared", TourCatalogTests.Tour("shared.custom"));

        Assert.Equal(TourChangeStatus.Succeeded, result.Status);
        Assert.False(result.Tour.IsConflicting);
        Assert.False(result.Tour.IsEnabled);
        Assert.Equal(TourSource.Module, (await service.GetTourAsync("shared"))!.Source);
    }

    [Fact]
    public async Task UserTours_GlobalSwitchOff_IsEmpty()
    {
        _globalEnabled = false;

        Assert.Empty(await CreateService().GetUserToursAsync("admin-shell", userCreatedDate: null));
    }

    [Fact]
    public async Task UserTours_KeepTheAudienceRule()
    {
        _moduleTours[0].Tour["publishedAt"] = "2026-01-01";
        var service = CreateService();

        var newUser = await service.GetUserToursAsync("admin-shell", new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc));
        var oldUser = await service.GetUserToursAsync("admin-shell", new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.Empty(newUser);
        Assert.Single(oldUser);
    }

    [Theory]
    [InlineData("../admin-shell")]
    [InlineData("")]
    [InlineData(null)]
    public async Task UserTours_RejectAppIdsThatAreNotPlainNames(string appId)
    {
        Assert.Empty(await CreateService().GetUserToursAsync(appId, userCreatedDate: null));
    }

    [Fact]
    public async Task MergedList_IsCached_UntilAWrite()
    {
        var service = CreateService();

        await service.GetToursAsync();
        await service.GetUserToursAsync("admin-shell", userCreatedDate: null);
        _tourDefinitionService.Verify(x => x.GetTours(), Times.Once);

        await service.SetEnabledAsync(ModuleTourId, false);
        var tours = await service.GetToursAsync();

        Assert.False(tours.Single().IsEnabled);
    }

    [Fact]
    public async Task GetTours_ReturnsCopiesThatCallersCannotCorrupt()
    {
        var service = CreateService();

        (await service.GetToursAsync())[0].Tour["id"] = "changed";

        Assert.NotNull(await service.GetTourAsync(ModuleTourId));
    }

    private TourService CreateService()
    {
        var settingsManager = new Mock<ISettingsManager>();
        settingsManager
            .Setup(x => x.GetObjectSettingAsync("GuidedTours.Enabled", It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(() => new ObjectSettingEntry { Name = "GuidedTours.Enabled", Value = _globalEnabled });

        var memoryCache = new PlatformMemoryCache(
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new CachingOptions()),
            NullLogger<PlatformMemoryCache>.Instance);

        return new TourService(
            () => new GuidedToursRepository(new GuidedToursDbContext(_dbOptions)),
            _tourDefinitionService.Object,
            memoryCache,
            settingsManager.Object);
    }

    private void AddModuleTour(string id, string appId = "admin-shell", string moduleId = "Module.A")
    {
        _moduleTours.Add(new ModuleTour { ModuleId = moduleId, Tour = TourCatalogTests.Tour(id, appId) });
    }
}
