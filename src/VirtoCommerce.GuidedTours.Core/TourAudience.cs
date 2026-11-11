using System;
using System.Globalization;
using Newtonsoft.Json.Linq;

namespace VirtoCommerce.GuidedTours.Core;

public static class TourAudience
{
    /// <summary>
    /// A tour about a feature that shipped (<c>publishedAt</c>) before the user's account
    /// existed is not news to that user. Tours without a valid date go to everyone.
    /// </summary>
    public static bool IsRelevantFor(JObject tour, DateTime? userCreatedDate)
    {
        if (userCreatedDate is null || tour["publishedAt"] is not { } publishedAt)
        {
            return true;
        }

        DateTime published;
        if (publishedAt.Type == JTokenType.Date)
        {
            published = publishedAt.Value<DateTime>();
        }
        else if (!DateTime.TryParse(publishedAt.Value<string>(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out published))
        {
            return true;
        }

        return userCreatedDate.Value.ToUniversalTime() <= published.ToUniversalTime();
    }
}
