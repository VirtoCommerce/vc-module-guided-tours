namespace VirtoCommerce.GuidedTours.Core.Models;

public class TourProblem
{
    public TourProblem()
    {
    }

    public TourProblem(string path, string message)
    {
        Path = path;
        Message = message;
    }

    /// <summary>
    /// JS-style path from the tour root: <c>""</c> for the root, <c>steps[1].action.until</c>, <c>title.en-US</c>.
    /// </summary>
    public string Path { get; set; }

    public string Message { get; set; }
}
