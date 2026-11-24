export function updateLiveryVariations(xml, modelFile, { count, index, remove }) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return { xml, changed: false, compatible: false };
  const modelName = (modelFile ?? "").toLowerCase().replace(/(?:_hi)?\.yft$/, "");
  const models = doc.querySelectorAll("variationData > Item");
  const model = [...models].find(
    (item) => item.querySelector(":scope > modelName")?.textContent.trim().toLowerCase() === modelName,
  );
  const lists = [...(model?.querySelectorAll(":scope > colors > Item > liveries") ?? [])]
    .filter((list) => list.children.length);
  if (!lists.length) return { xml, changed: false, compatible: true };
  if (lists.some((list) => list.children.length !== count ||
    [...list.children].some((item) => item.tagName !== "Item" || !/^(true|false|0|1)$/i.test(item.getAttribute("value") ?? ""))))
    return { xml, changed: false, compatible: false };
  for (const list of lists) {
    if (remove) list.children[index].remove();
    else list.append(list.children[index].cloneNode(true));
  }
  return {
    xml: new XMLSerializer().serializeToString(doc),
    changed: true,
    compatible: true,
  };
}
