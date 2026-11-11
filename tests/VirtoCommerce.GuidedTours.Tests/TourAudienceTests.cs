using System;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Core;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public class TourAudienceTests
{
    private static readonly DateTime Shipped = new(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void UserCreatedBeforeTheFeatureShipped_SeesTheTour()
    {
        Assert.True(TourAudience.IsRelevantFor(Tour("2026-11-01"), Shipped.AddDays(-30)));
    }

    [Fact]
    public void UserCreatedAfterTheFeatureShipped_DoesNotSeeTheTour()
    {
        Assert.False(TourAudience.IsRelevantFor(Tour("2026-11-01"), Shipped.AddDays(1)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not a date")]
    public void TourWithoutAValidDate_GoesToEveryone(string publishedAt)
    {
        var tour = publishedAt is null ? new JObject() : Tour(publishedAt);

        Assert.True(TourAudience.IsRelevantFor(tour, Shipped.AddYears(1)));
    }

    [Fact]
    public void UnknownUserCreationDate_SeesTheTour()
    {
        Assert.True(TourAudience.IsRelevantFor(Tour("2026-11-01"), null));
    }

    private static JObject Tour(string publishedAt)
    {
        return JObject.Parse($$"""{ "publishedAt": "{{publishedAt}}" }""");
    }
}
