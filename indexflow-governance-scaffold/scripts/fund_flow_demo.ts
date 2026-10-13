const flow = `
Investor / Grant Provider
        |
        v
+--------------------+
|  Estonia OU / LLC   |
+--------------------+
        |
        v
+--------------------+
|     DAO-lite       |
| (multi-sig proxy)  |
+--------------------+
        |
        v
+--------------------+
| Program Managers / |
|   Grants / Ops     |
+--------------------+
        |
        v
+--------------------+
|    Validators      |
+--------------------+
`;

function main() {
  console.log("IndexFlow DAO-lite dry-run fund flow:");
  console.log(flow);
  console.log(
    [
      "Legend:",
      "- Estonia OU or Wyoming LLC holds bank account and off-chain contracts.",
      "- DAO-lite signs program spend instructions (no live asset custody).",
      "- Validators receive staged payments once program KPIs are confirmed."
    ].join("\n")
  );
}

main();
