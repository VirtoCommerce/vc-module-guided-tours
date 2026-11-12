using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using VirtoCommerce.GuidedTours.Core.Models;
using VirtoCommerce.GuidedTours.Core.Validation;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public class TourCatalogTests
{
    private static readonly Dictionary<string, bool> NoSwitches = [];

    [Fact]
    public void Merge_ListsModuleToursFirst_ThenCustomToursById()
    {
        var tours = TourCatalog.Merge(
            [Module("m.b"), Module("m.a")],
            [Custom("c.b"), Custom("c.a")],
            NoSwitches);

        Assert.Equal(["m.b", "m.a", "c.a", "c.b"], tours.Select(x => x.Id));
        Assert.Equal([TourSource.Module, TourSource.Module, TourSource.Custom, TourSource.Custom], tours.Select(x => x.Source));
    }

    [Fact]
    public void Merge_TourWithoutASwitch_IsOn()
    {
        var tours = TourCatalog.Merge([Module("m.a")], [Custom("c.a")], NoSwitches);

        Assert.All(tours, x => Assert.True(x.IsEnabled));
    }

    [Fact]
    public void Merge_SwitchAppliesToModuleAndCustomTours()
    {
        var tours = TourCatalog.Merge(
            [Module("m.a"), Module("m.b")],
            [Custom("c.a"), Custom("c.b")],
            new Dictionary<string, bool> { ["m.a"] = false, ["m.b"] = true, ["c.a"] = false });

        Assert.Equal([false, true, false, true], tours.Select(x => x.IsEnabled));
    }

    [Fact]
    public void Merge_CustomTourWithAModuleTourId_IsConflicting()
    {
        var tours = TourCatalog.Merge([Module("shared")], [Custom("shared"), Custom("own")], NoSwitches);

        Assert.Equal([("shared", false), ("own", false), ("shared", true)], tours.Select(x => (x.Id, x.IsConflicting)));
    }

    [Fact]
    public void Merge_ModuleToursCarryTheModuleId_CustomToursTheAuditFields()
    {
        var modified = new DateTime(2026, 11, 12, 0, 0, 0, DateTimeKind.Utc);
        var custom = Custom("c.a");
        custom.ModifiedDate = modified;
        custom.ModifiedBy = "writer";

        var tours = TourCatalog.Merge([Module("m.a")], [custom], NoSwitches);

        Assert.Equal("Module.A", tours[0].ModuleId);
        Assert.Null(tours[0].ModifiedDate);
        Assert.Null(tours[0].ModifiedBy);
        Assert.Null(tours[1].ModuleId);
        Assert.Equal(modified, tours[1].ModifiedDate);
        Assert.Equal("writer", tours[1].ModifiedBy);
    }

    [Fact]
    public void Merge_NewCustomTour_UsesTheCreationAuditFields()
    {
        var created = new DateTime(2026, 11, 12, 0, 0, 0, DateTimeKind.Utc);
        var custom = Custom("c.a");
        custom.CreatedDate = created;
        custom.CreatedBy = "writer";

        var tour = Assert.Single(TourCatalog.Merge([], [custom], NoSwitches));

        Assert.Equal(created, tour.ModifiedDate);
        Assert.Equal("writer", tour.ModifiedBy);
    }

    [Fact]
    public void SelectForUsers_KeepsToursOfTheAppThatAreOnAndNotConflicting()
    {
        var tours = TourCatalog.Merge(
            [Module("m.on"), Module("m.off"), Module("m.other-app", appId: "other-app"), Module("shared")],
            [Custom("c.on"), Custom("c.off"), Custom("shared")],
            new Dictionary<string, bool> { ["m.off"] = false, ["c.off"] = false });

        var result = TourCatalog.SelectForUsers(tours, "admin-shell", userCreatedDate: null);

        Assert.Equal(["m.on", "shared", "c.on"], result.Select(x => x.Value<string>("id")));
    }

    [Fact]
    public void SelectForUsers_DropsToursAboutFeaturesThatShippedBeforeTheUserExisted()
    {
        var tours = TourCatalog.Merge(
            [Module("m.old", publishedAt: "2026-01-01"), Module("m.new", publishedAt: "2026-12-01")],
            [Custom("c.old", publishedAt: "2026-01-01")],
            NoSwitches);

        var result = TourCatalog.SelectForUsers(tours, "admin-shell", new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(["m.new"], result.Select(x => x.Value<string>("id")));
    }

    [Fact]
    public void SelectForUsers_AddsModuleIdToModuleToursOnly()
    {
        var tours = TourCatalog.Merge([Module("m.a")], [Custom("c.a")], NoSwitches);

        var result = TourCatalog.SelectForUsers(tours, "admin-shell", userCreatedDate: null);

        Assert.Equal("Module.A", result[0].Value<string>("moduleId"));
        Assert.False(result[1].ContainsKey("moduleId"));
    }

    [Fact]
    public void SelectForUsers_ReturnsCopies()
    {
        var tours = TourCatalog.Merge([Module("m.a")], [], NoSwitches);

        TourCatalog.SelectForUsers(tours, "admin-shell", userCreatedDate: null)[0]["id"] = "changed";

        Assert.Equal("m.a", tours[0].Id);
        Assert.False(tours[0].Tour.ContainsKey("moduleId"));
    }

    [Fact]
    public void Find_ConflictingId_ReturnsTheModuleTour()
    {
        var tours = TourCatalog.Merge([Module("shared")], [Custom("shared")], NoSwitches);

        Assert.Equal(TourSource.Module, TourCatalog.Find(tours, "shared")!.Source);
        Assert.Null(TourCatalog.Find(tours, "missing"));
    }

    [Fact]
    public void CreateCopyId_AppendsCopy()
    {
        Assert.Equal("orders.basics-copy", TourCatalog.CreateCopyId("orders.basics", _ => false));
    }

    [Fact]
    public void CreateCopyId_NumbersFurtherCopies()
    {
        var taken = new HashSet<string> { "orders.basics-copy", "orders.basics-copy-2" };

        Assert.Equal("orders.basics-copy-3", TourCatalog.CreateCopyId("orders.basics", taken.Contains));
    }

    [Fact]
    public void CreateCopyId_StaysWithinTheIdLimit()
    {
        var id = new string('a', TourValidator.MaxIdLength);
        var taken = new HashSet<string> { new string('a', TourValidator.MaxIdLength - 5) + "-copy" };

        var copyId = TourCatalog.CreateCopyId(id, taken.Contains);

        Assert.Equal(new string('a', TourValidator.MaxIdLength - 7) + "-copy-2", copyId);
        Assert.True(TourValidator.IsValidTourId(copyId));
    }

    [Fact]
    public void CreateCopy_SetsTheIdAndMarksEveryTitleText()
    {
        var tour = Tour("orders.basics");
        tour["title"] = new JObject { ["en-US"] = "Orders", ["de-DE"] = "Bestellungen" };
        tour["steps"]![0]!["title"] = new JObject { ["en-US"] = "Step" };

        var copy = TourCatalog.CreateCopy(tour, "orders.basics-copy");

        Assert.Equal("orders.basics-copy", copy.Value<string>("id"));
        Assert.Equal("Orders (copy)", copy["title"]!.Value<string>("en-US"));
        Assert.Equal("Bestellungen (copy)", copy["title"]!.Value<string>("de-DE"));
        Assert.Equal("Step", copy["steps"]![0]!["title"]!.Value<string>("en-US"));
        Assert.Empty(TourValidator.Validate(copy));
    }

    [Fact]
    public void CreateCopy_LeavesTheOriginalAsItWas()
    {
        var tour = Tour("orders.basics");

        TourCatalog.CreateCopy(tour, "orders.basics-copy");

        Assert.Equal("orders.basics", tour.Value<string>("id"));
        Assert.Equal("Orders", tour["title"]!.Value<string>("en-US"));
    }

    internal static JObject Tour(string id, string appId = "admin-shell", string publishedAt = null)
    {
        var tour = (JObject)TourJson.Parse($$"""
            {
              "id": "{{id}}",
              "version": 1,
              "appId": "{{appId}}",
              "title": { "en-US": "Orders" },
              "trigger": { "appReady": true },
              "steps": [ { "text": { "en-US": "Hello" } } ]
            }
            """);

        if (publishedAt != null)
        {
            tour["publishedAt"] = publishedAt;
        }

        return tour;
    }

    private static ModuleTour Module(string id, string appId = "admin-shell", string publishedAt = null)
    {
        return new ModuleTour { ModuleId = "Module.A", Tour = Tour(id, appId, publishedAt) };
    }

    private static CustomTour Custom(string id, string publishedAt = null)
    {
        return new CustomTour { TourId = id, AppId = "admin-shell", Tour = Tour(id, publishedAt: publishedAt) };
    }
}
