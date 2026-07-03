import { describe, expect, it } from "vitest";
import { GITHUB_ISSUES_URL, GITHUB_NEW_ISSUE_URL, GITHUB_REPO_URL } from "../links";

describe("github links", () => {
  it("point at the project repo", () => {
    expect(GITHUB_REPO_URL).toBe("https://github.com/Artem1bar/pissmap");
    expect(GITHUB_ISSUES_URL).toBe(`${GITHUB_REPO_URL}/issues`);
    expect(GITHUB_NEW_ISSUE_URL).toBe(`${GITHUB_REPO_URL}/issues/new`);
  });
});
