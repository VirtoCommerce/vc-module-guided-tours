using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace VirtoCommerce.GuidedTours.Core.Validation;

public static class TourJson
{
    private static readonly JsonLoadSettings LoadSettings = new()
    {
        DuplicatePropertyNameHandling = DuplicatePropertyNameHandling.Error,
    };

    /// <summary>
    /// Parses tour JSON keeping every string as a string: date-like values such as
    /// <c>publishedAt</c> are not turned into dates, so a tour is stored and served as written.
    /// </summary>
    /// <exception cref="JsonReaderException">The text is not a single JSON value.</exception>
    public static JToken Parse(string json)
    {
        using var reader = new JsonTextReader(new StringReader(json ?? string.Empty))
        {
            DateParseHandling = DateParseHandling.None,
        };

        var token = JToken.ReadFrom(reader, LoadSettings);

        var hasMore = reader.Read();
        while (hasMore)
        {
            hasMore = reader.Read();
        }

        return token;
    }
}
