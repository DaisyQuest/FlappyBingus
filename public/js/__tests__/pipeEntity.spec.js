import { describe, expect, it } from "vitest";
import { Gate, Pipe } from "../pipes/pipeEntity.js";
import * as entities from "../entities.js";

describe("pipeEntity", () => {
  it("re-exports pipe entities from the main module", () => {
    expect(Pipe).toBe(entities.Pipe);
    expect(Gate).toBe(entities.Gate);
  });
});
