"""Package prepared clothing resources; never pretend to compile Rockstar binaries."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
import xml.etree.ElementTree as ET


COMPONENTS = frozenset({"head", "berd", "hair", "uppr", "lowr", "hand", "feet",
                        "teef", "accs", "task", "decl", "jbib"})


@dataclass(frozen=True)
class Entry:
    source: Path
    destination: str


@dataclass(frozen=True)
class Plan:
    collection: str
    entries: tuple[Entry, ...]


def asset(path: Path, suffix: str) -> Path:
    if path.is_symlink() or not path.is_file() or path.suffix.lower() != suffix:
        raise ValueError(f"Arquivo regular {suffix} obrigatório: {path.name}")
    if path.stat().st_size == 0:
        raise ValueError(f"Arquivo vazio: {path.name}")
    if suffix != ".meta":
        with path.open("rb") as stream:
            if stream.read(4) != b"RSC7":
                raise ValueError(f"Recurso Legacy RSC7 obrigatório: {path.name}")
    return path


def plan_export(source: Path, pack: str, gender: str) -> Plan:
    """Input is a flat, trusted local directory from a native preparation adapter.

    Full collection names are required to avoid renaming files while leaving
    stale hashes/names inside YMT/YDD. RSC7 magic is only a sanity check.
    """
    if not re.fullmatch(r"[a-z][a-z0-9_]{0,31}", pack):
        raise ValueError("Pack: use 1–32 caracteres a-z, 0-9 e _, iniciando com letra")
    if gender not in {"male", "female"}:
        raise ValueError("Gênero deve ser male ou female")
    if not source.is_dir():
        raise ValueError("Diretório de entrada inexistente")
    ped = "mp_m_freemode_01" if gender == "male" else "mp_f_freemode_01"
    collection = f"{ped}_{pack}"
    meta = asset(source / f"{collection}.meta", ".meta")
    root = ET.parse(meta).getroot()
    if root.findtext("pedName") != ped or root.findtext("dlcName") != collection:
        raise ValueError("pedName/dlcName do .meta não correspondem à coleção")
    ymt = asset(source / f"{collection}.ymt", ".ymt")
    entries = [Entry(meta, meta.name), Entry(ymt, f"stream/{ymt.name}")]
    drawables: set[tuple[str, str]] = set()
    textures: set[tuple[str, str]] = set()
    for path in sorted(source.iterdir()):
        if path.suffix.lower() not in {".ydd", ".ytd"}:
            continue
        pattern = (re.escape(collection) +
                   r"\^([a-z]{4})_(?:(\d{3})_u\.ydd|diff_(\d{3})_([a-z])_uni\.ytd)")
        match = re.fullmatch(pattern, path.name)
        if not match or match[1] not in COMPONENTS:
            raise ValueError(f"Nome de componente não suportado: {path.name}")
        component, drawable, texture, _variation = match.groups()
        (drawables if drawable else textures).add((component, drawable or texture))
        asset(path, path.suffix)
        entries.append(Entry(path, f"stream/[{gender}]/{component}/{path.name}"))
    if not drawables or drawables != textures:
        raise ValueError("Cada YDD precisa de ao menos um YTD do mesmo componente/índice; YTD órfão não é aceito")
    return Plan(collection, tuple(entries))


def export(plan: Plan, output: Path) -> Path:
    """Stage then rename into an absent destination; never overwrite a resource."""
    if output.exists() or output.is_symlink():
        raise ValueError("Destino já existe; escolha uma pasta nova")
    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".godoy-", dir=output.parent))
    try:
        for entry in plan.entries:
            target = stage / entry.destination
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(entry.source, target)
        (stage / "fxmanifest.lua").write_text(
            "fx_version 'cerulean'\ngame 'gta5'\n\n"
            f"files {{ '{plan.collection}.meta' }}\n"
            f"data_file 'SHOP_PED_APPAREL_META_FILE' '{plan.collection}.meta'\n",
            encoding="utf-8")
        stage.rename(output)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--pack", required=True)
    parser.add_argument("--gender", choices=["male", "female"], required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        plan = plan_export(args.source, args.pack, args.gender)
        if args.output is None:
            print(json.dumps({"collection": plan.collection,
                              "files": [e.destination for e in plan.entries]}, indent=2))
        else:
            print(export(plan, args.output))
    except (ValueError, OSError, ET.ParseError) as error:
        parser.exit(2, f"Erro: {error}\n")


if __name__ == "__main__":
    main()
