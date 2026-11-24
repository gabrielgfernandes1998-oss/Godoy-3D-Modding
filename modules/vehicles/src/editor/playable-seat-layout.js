const children = (node, tag) => [...(node?.children ?? [])].filter((el) => el.localName === tag);
const child = (node, tag) => children(node, tag)[0];
const text = (node, tag) => child(node, tag)?.textContent.trim();
const ref = (node, tag) => child(node, tag)?.getAttribute("ref");
const same = (a, b) => a?.toLowerCase() === b?.toLowerCase();
const items = (root, tag) => children(child(root, tag), "Item");
const named = (list, name) => name ? list.find((element) => same(text(element, "Name"), name)) : null;
function parse(xml, label) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw Error(`${label} precisa estar em XML válido.`);
  return doc;
}

export function inspectSeatLayout(vehiclesXml, layoutsXml, modelName) {
  const vehicles = parse(vehiclesXml, "vehicles.meta");
  const layouts = parse(layoutsXml, "vehiclelayouts.meta");
  const model = items(vehicles.documentElement, "InitDatas").find(
    (item) => same(text(item, "modelName"), modelName),
  );
  if (!model || !text(model, "layout")) throw Error(`O vehicles.meta não define o layout de ${modelName}.`);
  const root = layouts.documentElement;
  const layout = named(items(root, "VehicleLayoutInfos"), text(model, "layout"));
  if (!layout) throw Error(`Importe um vehiclelayouts.meta que contenha ${text(model, "layout")} e suas definições.`);
  const seatDefinitions = items(root, "VehicleSeatInfos");
  const entryDefinitions = items(root, "VehicleEntryPointInfos");
  const donors = items(layout, "Seats").flatMap((item) => {
    const definition = named(seatDefinitions, ref(item, "SeatInfo"));
    const bone = text(definition, "SeatBoneName");
    if (!bone || same(bone, "seat_dside_f") || !ref(item, "SeatAnimInfo")) return [];
    return [{ item, definition, bone }];
  });
  const doors = items(layout, "EntryPoints").flatMap((item) => {
    const definition = named(entryDefinitions, ref(item, "EntryPointInfo"));
    const door = text(definition, "DoorBoneName");
    const seats = child(definition, "AccessableSeats");
    if (!door || !seats || !ref(item, "EntryPointAnimInfo")) return [];
    return [{ item, definition, door, id: text(definition, "Name") }];
  });
  return { vehicles, layouts, model, layout, donors, doors };
}

export function addPlayableSeatMetadata(vehiclesXml, layoutsXml, modelName, donorBone, entryId, newBone) {
  if (!/^[a-z0-9_-]{1,64}$/i.test(modelName) || !/^seat_(dside|pside)_[fmr][0-9]{1,5}$/i.test(newBone))
    throw Error("Nome do modelo ou do novo osso inválido.");
  const { vehicles, layouts, model, layout, donors, doors } =
    inspectSeatLayout(vehiclesXml, layoutsXml, modelName);
  const donor = donors.find(({ bone }) => same(bone, donorBone));
  const access = doors.find(({ id }) => same(id, entryId));
  if (!donor || !access) throw Error("Selecione um assento base e uma porta definidos no layout.");
  const root = layouts.documentElement;
  const prefix = `GODOY_${modelName.toUpperCase().replaceAll("-", "_")}_${newBone.toUpperCase()}`;
  const layoutId = `LAYOUT_${prefix}`, seatId = `SEAT_${prefix}`, accessId = `ENTRY_POINT_${prefix}`;
  for (const [tag, name] of [
    ["VehicleLayoutInfos", layoutId], ["VehicleSeatInfos", seatId], ["VehicleEntryPointInfos", accessId],
  ]) if (named(items(root, tag), name)) throw Error("O identificador do novo assento já está em uso.");

  const seat = donor.definition.cloneNode(true);
  child(seat, "Name").textContent = seatId;
  child(seat, "SeatBoneName").textContent = newBone;
  child(root, "VehicleSeatInfos").append(seat);

  const entry = access.definition.cloneNode(true);
  child(entry, "Name").textContent = accessId;
  const newAccess = layouts.createElement("Item");
  newAccess.setAttribute("ref", seatId);
  child(entry, "AccessableSeats").append(newAccess);
  child(root, "VehicleEntryPointInfos").append(entry);

  const updated = layout.cloneNode(true);
  child(updated, "Name").textContent = layoutId;
  const assignment = donor.item.cloneNode(true);
  child(assignment, "SeatInfo").setAttribute("ref", seatId);
  child(updated, "Seats").append(assignment);
  const targetEntry = items(updated, "EntryPoints").find(
    (item) => same(ref(item, "EntryPointInfo"), access.id),
  );
  child(targetEntry, "EntryPointInfo").setAttribute("ref", accessId);
  // Some custom animation definitions reference their entry point explicitly.
  const animations = items(root, "VehicleEntryPointAnimInfos");
  const currentAnim = named(animations, ref(targetEntry, "EntryPointAnimInfo"));
  if (currentAnim && same(ref(currentAnim, "EntryPointInfo"), access.id)) {
    const animId = `ENTRY_POINT_ANIM_${prefix}`;
    if (named(animations, animId)) throw Error("O identificador da animação de acesso já existe.");
    const animation = currentAnim.cloneNode(true);
    child(animation, "Name").textContent = animId;
    child(animation, "EntryPointInfo").setAttribute("ref", accessId);
    child(root, "VehicleEntryPointAnimInfos").append(animation);
    child(targetEntry, "EntryPointAnimInfo").setAttribute("ref", animId);
  }
  child(root, "VehicleLayoutInfos").append(updated);
  child(model, "layout").textContent = layoutId;

  const serializer = new XMLSerializer();
  return { vehicles: serializer.serializeToString(vehicles), layouts: serializer.serializeToString(layouts), door: access.door };
}
