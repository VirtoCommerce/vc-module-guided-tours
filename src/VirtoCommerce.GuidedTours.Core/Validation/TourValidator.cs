using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core.Models;

namespace VirtoCommerce.GuidedTours.Core.Validation;

/// <summary>
/// Checks the shape of a tour against the tour format. Strict: an unknown property is a problem.
/// Checks the format only, not whether a blade, permission or selector exists.
/// </summary>
public static partial class TourValidator
{
    public const int MaxIdLength = 128;

    public const string Required = "required";
    public const string NotEmpty = "must not be empty";
    public const string ExpectedObject = "expected an object";
    public const string ExpectedArray = "expected an array";
    public const string ExpectedString = "expected a string";
    public const string ExpectedTrue = "expected true";
    public const string ExpectedInteger = "expected an integer";
    public const string ExpectedPositiveInteger = "expected a positive integer";
    public const string ExpectedDate = "expected an ISO 8601 date or date-time";
    public const string ExpectedText = "expected an object of texts by language code";
    public const string ExpectedLanguage = "needs at least one language";
    public const string InvalidLanguageCode = "invalid language code. Expected a code like en-US or de.";
    public const string InvalidId = "may contain only lower-case letters, digits, dots, underscores and hyphens, and must start with a letter or digit";
    public const string InvalidAppId = "may contain only lower-case letters, digits and hyphens, and must start with a letter or digit";
    public const string IdTooLong = "must be at most 128 characters";
    public const string ExpectedTrigger = "expected appReady or bladeOpened";
    public const string ExpectedOneTrigger = "expected only one of appReady or bladeOpened";
    public const string ExpectedStep = "needs at least one step";
    public const string ExpectedPlacement = "expected top, right, bottom or left";
    public const string ExpectedCondition = "expected bladeOpened, bladeQueryChanged, routeChanged, elementAppears or click";
    public const string ExpectedOneCondition = "expected only one condition";
    public const string AtLeastWithoutElementAppears = "allowed only with elementAppears";
    public const string ExpectedTarget = "expected a data-tour name or an object with css or anchor";
    public const string ExpectedCssOrAnchor = "expected css or anchor";
    public const string ExpectedCssOrAnchorNotBoth = "expected css or anchor, not both";

    private const string AtLeast = "atLeast";
    private const string ElementAppears = "elementAppears";

    private static readonly string[] TourProperties = ["id", "version", "appId", "title", "permissions", "publishedAt", "priority", "trigger", "steps"];
    private static readonly string[] StepProperties = ["target", "title", "text", "placement", "waitFor", "action"];
    private static readonly string[] ActionProperties = ["until", "timeout"];
    private static readonly string[] TargetProperties = ["css", "anchor", "label"];
    private static readonly string[] Triggers = ["appReady", "bladeOpened"];
    private static readonly string[] Conditions = ["bladeOpened", "bladeQueryChanged", "routeChanged", ElementAppears, "click"];
    private static readonly string[] Placements = ["top", "right", "bottom", "left"];

    [GeneratedRegex(@"^[a-z0-9][a-z0-9._-]*\z")]
    private static partial Regex TourIdRegex();

    [GeneratedRegex(@"^[a-z0-9][a-z0-9-]*\z")]
    private static partial Regex AppIdRegex();

    [GeneratedRegex(@"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*\z")]
    private static partial Regex LanguageCodeRegex();

    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?\z")]
    private static partial Regex IsoDateRegex();

    public static string UnknownProperty(string name) => $"unknown property \"{name}\"";

    public static string UnknownTrigger(string name) => $"unknown trigger \"{name}\". Expected appReady or bladeOpened.";

    public static string UnknownCondition(string name) => $"unknown condition \"{name}\". Expected bladeOpened, bladeQueryChanged, routeChanged, elementAppears or click.";

    public static bool IsValidTourId(string id)
    {
        return id is { Length: > 0 and <= MaxIdLength } && TourIdRegex().IsMatch(id);
    }

    public static bool IsValidAppId(string appId)
    {
        return !string.IsNullOrEmpty(appId) && AppIdRegex().IsMatch(appId);
    }

    public static IList<TourProblem> Validate(JToken tour)
    {
        var problems = new List<TourProblem>();
        CheckTour(tour, problems);

        return problems;
    }

    private static void CheckTour(JToken token, List<TourProblem> problems)
    {
        const string path = "";

        if (token is not JObject tour)
        {
            problems.Add(new TourProblem(path, ExpectedObject));
            return;
        }

        CheckUnknownProperties(tour, path, TourProperties, problems);

        CheckRequired(tour, path, "id", CheckId, problems);
        CheckRequired(tour, path, "version", CheckPositiveInteger, problems);
        CheckRequired(tour, path, "appId", CheckAppId, problems);
        CheckRequired(tour, path, "title", CheckText, problems);
        CheckOptional(tour, path, "permissions", CheckPermissions, problems);
        CheckOptional(tour, path, "publishedAt", CheckDate, problems);
        CheckOptional(tour, path, "priority", CheckInteger, problems);
        CheckRequired(tour, path, "trigger", CheckTrigger, problems);
        CheckRequired(tour, path, "steps", CheckSteps, problems);
    }

    private static void CheckId(JToken token, string path, List<TourProblem> problems)
    {
        if (!CheckNonEmptyString(token, path, problems))
        {
            return;
        }

        var id = token.Value<string>();
        if (id.Length > MaxIdLength)
        {
            problems.Add(new TourProblem(path, IdTooLong));
        }

        if (!TourIdRegex().IsMatch(id))
        {
            problems.Add(new TourProblem(path, InvalidId));
        }
    }

    private static void CheckAppId(JToken token, string path, List<TourProblem> problems)
    {
        if (CheckNonEmptyString(token, path, problems) && !AppIdRegex().IsMatch(token.Value<string>()))
        {
            problems.Add(new TourProblem(path, InvalidAppId));
        }
    }

    private static void CheckPermissions(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JArray permissions)
        {
            problems.Add(new TourProblem(path, ExpectedArray));
            return;
        }

        for (var i = 0; i < permissions.Count; i++)
        {
            CheckNonEmptyString(permissions[i], Index(path, i), problems);
        }
    }

    private static void CheckDate(JToken token, string path, List<TourProblem> problems)
    {
        if (token.Type == JTokenType.Date)
        {
            return;
        }

        var isDate = token.Type == JTokenType.String
            && token.Value<string>() is { } value
            && IsoDateRegex().IsMatch(value)
            && DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out _);

        if (!isDate)
        {
            problems.Add(new TourProblem(path, ExpectedDate));
        }
    }

    private static void CheckTrigger(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JObject trigger)
        {
            problems.Add(new TourProblem(path, ExpectedObject));
            return;
        }

        var names = trigger.Properties().Select(x => x.Name).ToList();
        foreach (var name in names.Where(x => !Triggers.Contains(x)))
        {
            problems.Add(new TourProblem(path, UnknownTrigger(name)));
        }

        var known = names.Where(Triggers.Contains).ToList();
        if (names.Count == 0)
        {
            problems.Add(new TourProblem(path, ExpectedTrigger));
        }
        else if (known.Count > 1)
        {
            problems.Add(new TourProblem(path, ExpectedOneTrigger));
        }

        CheckOptional(trigger, path, "appReady", CheckTrue, problems);
        CheckOptional(trigger, path, "bladeOpened", CheckNonEmptyStringValue, problems);
    }

    private static void CheckSteps(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JArray steps)
        {
            problems.Add(new TourProblem(path, ExpectedArray));
            return;
        }

        if (steps.Count == 0)
        {
            problems.Add(new TourProblem(path, ExpectedStep));
        }

        for (var i = 0; i < steps.Count; i++)
        {
            CheckStep(steps[i], Index(path, i), problems);
        }
    }

    private static void CheckStep(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JObject step)
        {
            problems.Add(new TourProblem(path, ExpectedObject));
            return;
        }

        CheckUnknownProperties(step, path, StepProperties, problems);

        CheckOptional(step, path, "target", CheckTarget, problems);
        CheckOptional(step, path, "title", CheckText, problems);
        CheckRequired(step, path, "text", CheckText, problems);
        CheckOptional(step, path, "placement", CheckPlacement, problems);
        CheckOptional(step, path, "waitFor", CheckPositiveInteger, problems);
        CheckOptional(step, path, "action", CheckAction, problems);
    }

    private static void CheckPlacement(JToken token, string path, List<TourProblem> problems)
    {
        if (token.Type != JTokenType.String || !Placements.Contains(token.Value<string>()))
        {
            problems.Add(new TourProblem(path, ExpectedPlacement));
        }
    }

    private static void CheckAction(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JObject action)
        {
            problems.Add(new TourProblem(path, ExpectedObject));
            return;
        }

        CheckUnknownProperties(action, path, ActionProperties, problems);

        CheckRequired(action, path, "until", CheckCondition, problems);
        CheckOptional(action, path, "timeout", CheckPositiveInteger, problems);
    }

    private static void CheckCondition(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JObject condition)
        {
            problems.Add(new TourProblem(path, ExpectedObject));
            return;
        }

        var names = condition.Properties().Select(x => x.Name).ToList();
        foreach (var name in names.Where(x => x != AtLeast && !Conditions.Contains(x)))
        {
            problems.Add(new TourProblem(path, UnknownCondition(name)));
        }

        var known = names.Where(Conditions.Contains).ToList();
        if (names.Count == 0 || (known.Count == 0 && names.All(x => x == AtLeast)))
        {
            problems.Add(new TourProblem(path, ExpectedCondition));
        }
        else if (known.Count > 1)
        {
            problems.Add(new TourProblem(path, ExpectedOneCondition));
        }

        CheckOptional(condition, path, "bladeOpened", CheckNonEmptyStringValue, problems);
        CheckOptional(condition, path, "bladeQueryChanged", CheckNonEmptyStringValue, problems);
        CheckOptional(condition, path, "routeChanged", CheckTrue, problems);
        CheckOptional(condition, path, ElementAppears, CheckTarget, problems);
        CheckOptional(condition, path, "click", CheckTrue, problems);

        if (condition.TryGetValue(AtLeast, out var atLeast))
        {
            if (known.Contains(ElementAppears))
            {
                CheckPositiveInteger(atLeast, Member(path, AtLeast), problems);
            }
            else
            {
                problems.Add(new TourProblem(Member(path, AtLeast), AtLeastWithoutElementAppears));
            }
        }
    }

    private static void CheckTarget(JToken token, string path, List<TourProblem> problems)
    {
        if (token.Type == JTokenType.String)
        {
            CheckNonEmptyString(token, path, problems);
            return;
        }

        if (token is not JObject target)
        {
            problems.Add(new TourProblem(path, ExpectedTarget));
            return;
        }

        CheckUnknownProperties(target, path, TargetProperties, problems);

        var hasCss = target.ContainsKey("css");
        var hasAnchor = target.ContainsKey("anchor");
        if (!hasCss && !hasAnchor)
        {
            problems.Add(new TourProblem(path, ExpectedCssOrAnchor));
        }
        else if (hasCss && hasAnchor)
        {
            problems.Add(new TourProblem(path, ExpectedCssOrAnchorNotBoth));
        }

        CheckOptional(target, path, "css", CheckNonEmptyStringValue, problems);
        CheckOptional(target, path, "anchor", CheckNonEmptyStringValue, problems);
        CheckOptional(target, path, "label", CheckString, problems);
    }

    private static void CheckText(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JObject text)
        {
            problems.Add(new TourProblem(path, ExpectedText));
            return;
        }

        if (!text.HasValues)
        {
            problems.Add(new TourProblem(path, ExpectedLanguage));
        }

        foreach (var property in text.Properties())
        {
            var entryPath = Member(path, property.Name);
            if (!LanguageCodeRegex().IsMatch(property.Name))
            {
                problems.Add(new TourProblem(entryPath, InvalidLanguageCode));
            }

            CheckNonEmptyString(property.Value, entryPath, problems);
        }
    }

    private static void CheckPositiveInteger(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JValue { Type: JTokenType.Integer, Value: long value } || value <= 0 || value > int.MaxValue)
        {
            problems.Add(new TourProblem(path, ExpectedPositiveInteger));
        }
    }

    private static void CheckInteger(JToken token, string path, List<TourProblem> problems)
    {
        if (token is not JValue { Type: JTokenType.Integer, Value: long value } || value < int.MinValue || value > int.MaxValue)
        {
            problems.Add(new TourProblem(path, ExpectedInteger));
        }
    }

    private static void CheckTrue(JToken token, string path, List<TourProblem> problems)
    {
        if (token.Type != JTokenType.Boolean || !token.Value<bool>())
        {
            problems.Add(new TourProblem(path, ExpectedTrue));
        }
    }

    private static void CheckString(JToken token, string path, List<TourProblem> problems)
    {
        if (token.Type != JTokenType.String)
        {
            problems.Add(new TourProblem(path, ExpectedString));
        }
    }

    private static void CheckNonEmptyStringValue(JToken token, string path, List<TourProblem> problems)
    {
        CheckNonEmptyString(token, path, problems);
    }

    private static bool CheckNonEmptyString(JToken token, string path, List<TourProblem> problems)
    {
        if (token.Type != JTokenType.String)
        {
            problems.Add(new TourProblem(path, ExpectedString));
            return false;
        }

        if (string.IsNullOrWhiteSpace(token.Value<string>()))
        {
            problems.Add(new TourProblem(path, NotEmpty));
            return false;
        }

        return true;
    }

    private static void CheckUnknownProperties(JObject obj, string path, string[] knownProperties, List<TourProblem> problems)
    {
        foreach (var property in obj.Properties().Where(x => !knownProperties.Contains(x.Name)))
        {
            problems.Add(new TourProblem(path, UnknownProperty(property.Name)));
        }
    }

    private static void CheckRequired(JObject obj, string path, string name, Action<JToken, string, List<TourProblem>> check, List<TourProblem> problems)
    {
        if (obj.TryGetValue(name, out var value))
        {
            check(value, Member(path, name), problems);
        }
        else
        {
            problems.Add(new TourProblem(Member(path, name), Required));
        }
    }

    private static void CheckOptional(JObject obj, string path, string name, Action<JToken, string, List<TourProblem>> check, List<TourProblem> problems)
    {
        if (obj.TryGetValue(name, out var value))
        {
            check(value, Member(path, name), problems);
        }
    }

    private static string Member(string path, string name)
    {
        return path.Length == 0 ? name : $"{path}.{name}";
    }

    private static string Index(string path, int index)
    {
        return $"{path}[{index}]";
    }
}
