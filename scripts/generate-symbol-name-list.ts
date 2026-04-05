async function generateSymbolNameList() {
  const entries: string[] = [];
  for await (const entry of Deno.readDir("./symbols/small/regular")) {
    entries.push(entry.name);
  }

  const symbolNameList = entries
    .filter((entry) => entry.endsWith(".svg"))
    .map((entry) => entry.replace(".svg", ""));

  const textContent = `export const symbolNameList: string[] = ${
    JSON.stringify(symbolNameList, null, 2)
  }`;

  await Deno.writeTextFile("./lib/symbol-name-list.ts", textContent);
}

generateSymbolNameList();
