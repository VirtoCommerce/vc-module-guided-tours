using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core.Validation;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public class TourValidatorTests
{
    private const string FullTour = """
        {
          "id": "orders.workspace_1-a",
          "version": 2,
          "appId": "admin-shell",
          "title": { "en-US": "Find an order", "de": "Bestellung finden" },
          "permissions": [ "order:read" ],
          "publishedAt": "2026-11-01",
          "priority": -1,
          "trigger": { "bladeOpened": "OrdersList" },
          "steps": [
            { "text": { "en-US": "Welcome" } },
            {
              "target": "orders-search",
              "title": { "en-US": "Search" },
              "text": { "en-US": "Type here" },
              "placement": "bottom",
              "waitFor": 500,
              "action": { "until": { "bladeQueryChanged": "OrdersList" }, "timeout": 30000 }
            },
            {
              "target": { "css": ".grid", "label": "orders grid" },
              "text": { "en-US": "Rows" },
              "action": { "until": { "elementAppears": { "anchor": "row", "label": "an order row" }, "atLeast": 2 } }
            },
            { "target": { "anchor": "toolbar" }, "text": { "en-US": "Click" }, "action": { "until": { "click": true } } },
            { "text": { "en-US": "Go" }, "action": { "until": { "routeChanged": true } } },
            { "text": { "en-US": "Open" }, "action": { "until": { "bladeOpened": "OrderDetails" } } }
          ]
        }
        """;

    [Fact]
    public void TourUsingEveryPartOfTheFormat_HasNoProblems()
    {
        Assert.Empty(Problems(Tour()));
    }

    [Fact]
    public void MinimalTour_HasNoProblems()
    {
        var tour = TourJson.Parse("""
            { "id": "a", "version": 1, "appId": "a", "title": { "en": "A" }, "trigger": { "appReady": true }, "steps": [ { "text": { "en": "A" } } ] }
            """);

        Assert.Empty(Problems(tour));
    }

    [Fact]
    public void ContractExample_UnknownCondition()
    {
        var tour = Tour(x => x["steps"]![1]!["action"]!["until"] = new JObject { ["bladeOpend"] = "OrdersList" });

        var problem = Assert.Single(TourValidator.Validate(tour));

        Assert.Equal("steps[1].action.until", problem.Path);
        Assert.Equal("unknown condition \"bladeOpend\". Expected bladeOpened, bladeQueryChanged, routeChanged, elementAppears or click.", problem.Message);
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("\"tour\"")]
    [InlineData("null")]
    public void NotAnObject(string json)
    {
        AssertProblems(TourJson.Parse(json), ("", TourValidator.ExpectedObject));
    }

    [Fact]
    public void NullToken()
    {
        AssertProblems(null, ("", TourValidator.ExpectedObject));
    }

    [Theory]
    [InlineData("id")]
    [InlineData("version")]
    [InlineData("appId")]
    [InlineData("title")]
    [InlineData("trigger")]
    [InlineData("steps")]
    public void RequiredTourProperty(string name)
    {
        AssertProblems(Tour(x => x.Remove(name)), (name, TourValidator.Required));
    }

    [Theory]
    [InlineData("permissions")]
    [InlineData("publishedAt")]
    [InlineData("priority")]
    public void OptionalTourProperty(string name)
    {
        Assert.Empty(Problems(Tour(x => x.Remove(name))));
    }

    [Fact]
    public void RequiredStepText()
    {
        AssertProblems(Tour(x => Step(x, 1).Remove("text")), ("steps[1].text", TourValidator.Required));
    }

    [Fact]
    public void RequiredActionUntil()
    {
        AssertProblems(Tour(x => ((JObject)Step(x, 1)["action"]!).Remove("until")), ("steps[1].action.until", TourValidator.Required));
    }

    [Fact]
    public void UnknownProperty_OnTheTour()
    {
        AssertProblems(Tour(x => x["moduleId"] = "Module.A"), ("", "unknown property \"moduleId\""));
    }

    [Fact]
    public void UnknownProperty_OnAStep()
    {
        AssertProblems(Tour(x => Step(x, 0)["selector"] = ".grid"), ("steps[0]", "unknown property \"selector\""));
    }

    [Fact]
    public void UnknownProperty_OnAnAction()
    {
        AssertProblems(Tour(x => Step(x, 1)["action"]!["retries"] = 1), ("steps[1].action", "unknown property \"retries\""));
    }

    [Fact]
    public void UnknownProperty_OnATarget()
    {
        AssertProblems(Tour(x => Step(x, 2)["target"]!["xpath"] = "//div"), ("steps[2].target", "unknown property \"xpath\""));
    }

    [Theory]
    [InlineData("Orders")]
    [InlineData("-orders")]
    [InlineData(".orders")]
    [InlineData("orders basics")]
    [InlineData("orders/basics")]
    [InlineData("orders\n")]
    public void Id_WithCharactersOutsideThePattern(string id)
    {
        AssertProblems(Tour(x => x["id"] = id), ("id", TourValidator.InvalidId));
    }

    [Fact]
    public void Id_Empty()
    {
        AssertProblems(Tour(x => x["id"] = ""), ("id", TourValidator.NotEmpty));
    }

    [Fact]
    public void Id_NotAString()
    {
        AssertProblems(Tour(x => x["id"] = 1), ("id", TourValidator.ExpectedString));
    }

    [Fact]
    public void Id_LongerThan128Characters()
    {
        AssertProblems(Tour(x => x["id"] = new string('a', 129)), ("id", TourValidator.IdTooLong));
    }

    [Fact]
    public void Id_Of128Characters()
    {
        Assert.Empty(Problems(Tour(x => x["id"] = new string('a', 128))));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1.5")]
    [InlineData("\"1\"")]
    [InlineData("2147483648")]
    [InlineData("99999999999999999999999")]
    [InlineData("null")]
    public void Version_NotAPositiveInteger(string json)
    {
        AssertProblems(Tour(x => x["version"] = TourJson.Parse(json)), ("version", TourValidator.ExpectedPositiveInteger));
    }

    [Theory]
    [InlineData("Admin-Shell")]
    [InlineData("admin_shell")]
    [InlineData("-admin")]
    [InlineData("admin.shell")]
    public void AppId_WithCharactersOutsideThePattern(string appId)
    {
        AssertProblems(Tour(x => x["appId"] = appId), ("appId", TourValidator.InvalidAppId));
    }

    [Fact]
    public void AppId_Empty()
    {
        AssertProblems(Tour(x => x["appId"] = ""), ("appId", TourValidator.NotEmpty));
    }

    [Theory]
    [InlineData("en")]
    [InlineData("de-DE")]
    [InlineData("fil")]
    [InlineData("zh-Hant-TW")]
    [InlineData("sr-Latn")]
    public void Text_LanguageCodes(string code)
    {
        Assert.Empty(Problems(Tour(x => x["title"] = new JObject { [code] = "Title" })));
    }

    [Theory]
    [InlineData("EN")]
    [InlineData("en_US")]
    [InlineData("english")]
    [InlineData("e")]
    [InlineData("en-")]
    [InlineData("en-U")]
    public void Text_InvalidLanguageCode(string code)
    {
        AssertProblems(Tour(x => x["title"] = new JObject { [code] = "Title" }), ($"title.{code}", TourValidator.InvalidLanguageCode));
    }

    [Fact]
    public void Text_AsAnI18nKeyString()
    {
        AssertProblems(Tour(x => x["title"] = "orders.tour.title"), ("title", TourValidator.ExpectedText));
    }

    [Fact]
    public void Text_WithoutLanguages()
    {
        AssertProblems(Tour(x => x["title"] = new JObject()), ("title", TourValidator.ExpectedLanguage));
    }

    [Theory]
    [InlineData("\"\"")]
    [InlineData("\"  \"")]
    public void Text_EmptyValue(string json)
    {
        AssertProblems(Tour(x => x["title"]!["en-US"] = TourJson.Parse(json)), ("title.en-US", TourValidator.NotEmpty));
    }

    [Fact]
    public void Text_NonStringValue()
    {
        AssertProblems(Tour(x => x["title"]!["de"] = 1), ("title.de", TourValidator.ExpectedString));
    }

    [Fact]
    public void Text_OfAStep()
    {
        AssertProblems(
            Tour(x =>
            {
                Step(x, 1)["title"] = new JObject();
                Step(x, 1)["text"] = new JObject { ["en-US"] = "" };
            }),
            ("steps[1].title", TourValidator.ExpectedLanguage),
            ("steps[1].text.en-US", TourValidator.NotEmpty));
    }

    [Fact]
    public void Permissions_NotAnArray()
    {
        AssertProblems(Tour(x => x["permissions"] = "order:read"), ("permissions", TourValidator.ExpectedArray));
    }

    [Fact]
    public void Permissions_WithEmptyOrNonStringItems()
    {
        AssertProblems(
            Tour(x => x["permissions"] = new JArray("order:read", "", 1)),
            ("permissions[1]", TourValidator.NotEmpty),
            ("permissions[2]", TourValidator.ExpectedString));
    }

    [Fact]
    public void Permissions_Empty()
    {
        Assert.Empty(Problems(Tour(x => x["permissions"] = new JArray())));
    }

    [Theory]
    [InlineData("2026-11-01")]
    [InlineData("2026-11-01T10:00")]
    [InlineData("2026-11-01T10:00:00Z")]
    [InlineData("2026-11-01T10:00:00.123+02:00")]
    public void PublishedAt_IsoDates(string value)
    {
        Assert.Empty(Problems(Tour(x => x["publishedAt"] = value)));
    }

    [Theory]
    [InlineData("\"01.11.2026\"")]
    [InlineData("\"2026-13-01\"")]
    [InlineData("\"2026-02-30\"")]
    [InlineData("\"yesterday\"")]
    [InlineData("\"2026-11-01 10:00\"")]
    [InlineData("20261101")]
    public void PublishedAt_NotAnIsoDate(string json)
    {
        AssertProblems(Tour(x => x["publishedAt"] = TourJson.Parse(json)), ("publishedAt", TourValidator.ExpectedDate));
    }

    [Theory]
    [InlineData("1.5")]
    [InlineData("\"1\"")]
    [InlineData("true")]
    public void Priority_NotAnInteger(string json)
    {
        AssertProblems(Tour(x => x["priority"] = TourJson.Parse(json)), ("priority", TourValidator.ExpectedInteger));
    }

    [Fact]
    public void Trigger_AppReady()
    {
        Assert.Empty(Problems(Tour(x => x["trigger"] = new JObject { ["appReady"] = true })));
    }

    [Fact]
    public void Trigger_NotAnObject()
    {
        AssertProblems(Tour(x => x["trigger"] = "appReady"), ("trigger", TourValidator.ExpectedObject));
    }

    [Fact]
    public void Trigger_Empty()
    {
        AssertProblems(Tour(x => x["trigger"] = new JObject()), ("trigger", TourValidator.ExpectedTrigger));
    }

    [Fact]
    public void Trigger_Both()
    {
        AssertProblems(
            Tour(x => x["trigger"]!["appReady"] = true),
            ("trigger", TourValidator.ExpectedOneTrigger));
    }

    [Fact]
    public void Trigger_Unknown()
    {
        AssertProblems(
            Tour(x => x["trigger"] = new JObject { ["bladeOpend"] = "OrdersList" }),
            ("trigger", "unknown trigger \"bladeOpend\". Expected appReady or bladeOpened."));
    }

    [Fact]
    public void Trigger_AppReadyNotTrue()
    {
        AssertProblems(Tour(x => x["trigger"] = new JObject { ["appReady"] = false }), ("trigger.appReady", TourValidator.ExpectedTrue));
    }

    [Fact]
    public void Trigger_BladeOpenedEmpty()
    {
        AssertProblems(Tour(x => x["trigger"]!["bladeOpened"] = ""), ("trigger.bladeOpened", TourValidator.NotEmpty));
    }

    [Fact]
    public void Steps_Empty()
    {
        AssertProblems(Tour(x => x["steps"] = new JArray()), ("steps", TourValidator.ExpectedStep));
    }

    [Fact]
    public void Steps_NotAnArray()
    {
        AssertProblems(Tour(x => x["steps"] = new JObject()), ("steps", TourValidator.ExpectedArray));
    }

    [Fact]
    public void Step_NotAnObject()
    {
        AssertProblems(Tour(x => x["steps"]![0] = "Welcome"), ("steps[0]", TourValidator.ExpectedObject));
    }

    [Theory]
    [InlineData("\"center\"")]
    [InlineData("\"Top\"")]
    [InlineData("1")]
    public void Step_Placement(string json)
    {
        AssertProblems(Tour(x => Step(x, 1)["placement"] = TourJson.Parse(json)), ("steps[1].placement", TourValidator.ExpectedPlacement));
    }

    [Theory]
    [InlineData("top")]
    [InlineData("right")]
    [InlineData("bottom")]
    [InlineData("left")]
    public void Step_PlacementValues(string value)
    {
        Assert.Empty(Problems(Tour(x => Step(x, 1)["placement"] = value)));
    }

    [Fact]
    public void Step_WaitForNotPositive()
    {
        AssertProblems(Tour(x => Step(x, 1)["waitFor"] = 0), ("steps[1].waitFor", TourValidator.ExpectedPositiveInteger));
    }

    [Fact]
    public void Action_NotAnObject()
    {
        AssertProblems(Tour(x => Step(x, 1)["action"] = "click"), ("steps[1].action", TourValidator.ExpectedObject));
    }

    [Fact]
    public void Action_TimeoutNotPositive()
    {
        AssertProblems(Tour(x => Step(x, 1)["action"]!["timeout"] = -5), ("steps[1].action.timeout", TourValidator.ExpectedPositiveInteger));
    }

    [Fact]
    public void Condition_NotAnObject()
    {
        AssertProblems(Tour(x => Until(x, 1, "bladeOpened")), ("steps[1].action.until", TourValidator.ExpectedObject));
    }

    [Fact]
    public void Condition_Empty()
    {
        AssertProblems(Tour(x => Until(x, 1, new JObject())), ("steps[1].action.until", TourValidator.ExpectedCondition));
    }

    [Fact]
    public void Condition_MoreThanOne()
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { ["click"] = true, ["routeChanged"] = true })),
            ("steps[1].action.until", TourValidator.ExpectedOneCondition));
    }

    [Theory]
    [InlineData("routeChanged", "false")]
    [InlineData("click", "\"yes\"")]
    public void Condition_FlagNotTrue(string condition, string json)
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { [condition] = TourJson.Parse(json) })),
            ($"steps[1].action.until.{condition}", TourValidator.ExpectedTrue));
    }

    [Theory]
    [InlineData("bladeOpened")]
    [InlineData("bladeQueryChanged")]
    public void Condition_BladeNameEmpty(string condition)
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { [condition] = "" })),
            ($"steps[1].action.until.{condition}", TourValidator.NotEmpty));
    }

    [Fact]
    public void Condition_ElementAppearsWithAnInvalidTarget()
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { ["elementAppears"] = new JObject { ["label"] = "row" } })),
            ("steps[1].action.until.elementAppears", TourValidator.ExpectedCssOrAnchor));
    }

    [Fact]
    public void Condition_AtLeastNotPositive()
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { ["elementAppears"] = "row", ["atLeast"] = 0 })),
            ("steps[1].action.until.atLeast", TourValidator.ExpectedPositiveInteger));
    }

    [Fact]
    public void Condition_AtLeastWithoutElementAppears()
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { ["click"] = true, ["atLeast"] = 2 })),
            ("steps[1].action.until.atLeast", TourValidator.AtLeastWithoutElementAppears));
    }

    [Fact]
    public void Condition_AtLeastAlone()
    {
        AssertProblems(
            Tour(x => Until(x, 1, new JObject { ["atLeast"] = 2 })),
            ("steps[1].action.until", TourValidator.ExpectedCondition),
            ("steps[1].action.until.atLeast", TourValidator.AtLeastWithoutElementAppears));
    }

    [Fact]
    public void Target_EmptyName()
    {
        AssertProblems(Tour(x => Step(x, 1)["target"] = ""), ("steps[1].target", TourValidator.NotEmpty));
    }

    [Fact]
    public void Target_NotAStringOrObject()
    {
        AssertProblems(Tour(x => Step(x, 1)["target"] = 5), ("steps[1].target", TourValidator.ExpectedTarget));
    }

    [Fact]
    public void Target_WithoutCssOrAnchor()
    {
        AssertProblems(Tour(x => Step(x, 1)["target"] = new JObject { ["label"] = "search" }), ("steps[1].target", TourValidator.ExpectedCssOrAnchor));
    }

    [Fact]
    public void Target_WithCssAndAnchor()
    {
        AssertProblems(
            Tour(x => Step(x, 1)["target"] = new JObject { ["css"] = ".a", ["anchor"] = "a" }),
            ("steps[1].target", TourValidator.ExpectedCssOrAnchorNotBoth));
    }

    [Theory]
    [InlineData("css")]
    [InlineData("anchor")]
    public void Target_EmptySelector(string name)
    {
        AssertProblems(Tour(x => Step(x, 1)["target"] = new JObject { [name] = " " }), ($"steps[1].target.{name}", TourValidator.NotEmpty));
    }

    [Fact]
    public void Target_LabelNotAString()
    {
        AssertProblems(Tour(x => Step(x, 2)["target"]!["label"] = 1), ("steps[2].target.label", TourValidator.ExpectedString));
    }

    [Fact]
    public void ReportsEveryProblemAtOnce()
    {
        var tour = Tour(x =>
        {
            x["id"] = "Bad Id";
            x.Remove("version");
            Step(x, 0)["placement"] = "middle";
        });

        AssertProblems(
            tour,
            ("id", TourValidator.InvalidId),
            ("version", TourValidator.Required),
            ("steps[0].placement", TourValidator.ExpectedPlacement));
    }

    [Fact]
    public void Messages_StartLowerCase_AndEndWithAPeriodOnlyAfterASecondSentence()
    {
        var messages = typeof(TourValidator)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(x => x.IsLiteral && x.FieldType == typeof(string))
            .Select(x => (string)x.GetRawConstantValue())
            .Concat([TourValidator.UnknownProperty("x"), TourValidator.UnknownTrigger("x"), TourValidator.UnknownCondition("x")])
            .ToList();

        Assert.All(messages, message =>
        {
            Assert.True(char.IsLower(message[0]), message);
            Assert.True(!message.EndsWith('.') || message.Contains(". "), message);
        });
    }

    [Theory]
    [InlineData("orders.basics", true)]
    [InlineData("Orders", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValidTourId(string id, bool expected)
    {
        Assert.Equal(expected, TourValidator.IsValidTourId(id));
    }

    private static JObject Tour(Action<JObject> change = null)
    {
        var tour = (JObject)TourJson.Parse(FullTour);
        change?.Invoke(tour);

        return tour;
    }

    private static JObject Step(JObject tour, int index)
    {
        return (JObject)tour["steps"]![index]!;
    }

    private static void Until(JObject tour, int stepIndex, JToken condition)
    {
        Step(tour, stepIndex)["action"]!["until"] = condition;
    }

    private static List<(string Path, string Message)> Problems(JToken tour)
    {
        return TourValidator.Validate(tour).Select(x => (x.Path, x.Message)).ToList();
    }

    private static void AssertProblems(JToken tour, params (string Path, string Message)[] expected)
    {
        Assert.Equal(expected, Problems(tour));
    }
}
