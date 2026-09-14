import { describe, expect, it } from "vitest";
import { AssessmentApiError, apiErrorFromBody } from "./assessmentApi";

describe("apiErrorFromBody", () => {
  it("reads { error, code } from the API body", () => {
    const err = apiErrorFromBody(
      { error: "Assessment not found.", code: "not_found" },
      "fallback",
    );
    expect(err).toBeInstanceOf(AssessmentApiError);
    expect(err.message).toBe("Assessment not found.");
    expect(err.code).toBe("not_found");
  });

  it("uses fallbacks when the body is missing or not an error object", () => {
    const missing = apiErrorFromBody(null, "Could not load assessments.");
    expect(missing.message).toBe("Could not load assessments.");
    expect(missing.code).toBe("request_failed");

    const empty = apiErrorFromBody({}, "Could not save the assessment.", "write_failed");
    expect(empty.message).toBe("Could not save the assessment.");
    expect(empty.code).toBe("write_failed");
  });
});
