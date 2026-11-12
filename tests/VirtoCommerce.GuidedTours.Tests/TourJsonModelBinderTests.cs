using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Moq;
using Newtonsoft.Json.Linq;
using VirtoCommerce.GuidedTours.Web.ModelBinders;
using Xunit;

namespace VirtoCommerce.GuidedTours.Tests;

[Trait("Category", "Unit")]
public class TourJsonModelBinderTests
{
    [Fact]
    public async Task KeepsDateLikeStringsAsWritten()
    {
        var context = await Bind("""{ "publishedAt": "2026-11-01", "title": { "en-US": "2026-11-01T10:00:00Z" } }""");

        var tour = Assert.IsType<JObject>(context.Result.Model);
        Assert.Equal(JTokenType.String, tour["publishedAt"]!.Type);
        Assert.Equal("2026-11-01T10:00:00Z", tour["title"]!.Value<string>("en-US"));
        Assert.True(context.ModelState.IsValid);
    }

    [Theory]
    [InlineData("{ \"id\": ")]
    [InlineData("")]
    [InlineData("{ \"id\": \"a\", \"id\": \"b\" }")]
    public async Task MalformedJson_LeavesAModelStateError(string body)
    {
        var context = await Bind(body);

        Assert.True(context.Result.IsModelSet);
        Assert.Null(context.Result.Model);
        Assert.False(context.ModelState.IsValid);
    }

    private static async Task<ModelBindingContext> Bind(string body)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));

        var modelState = new ModelStateDictionary();
        var context = new Mock<ModelBindingContext> { CallBase = true };
        context.SetupGet(x => x.HttpContext).Returns(httpContext);
        context.SetupGet(x => x.ModelState).Returns(modelState);
        context.SetupGet(x => x.ModelName).Returns("tour");
        context.SetupProperty(x => x.Result);

        await new TourJsonModelBinder().BindModelAsync(context.Object);

        return context.Object;
    }
}
