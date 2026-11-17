export class DomainFailure extends Error {
  constructor(readonly reason: "invalid_input" | "conflict") { super(reason); }
}
